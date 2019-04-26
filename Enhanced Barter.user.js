// ==UserScript==
// @name         Enhanced Barter
// @icon         https://bartervg.com/imgs/ico/barter/favicon-32x32.png
// @namespace    Revadike
// @author       Revadike
// @version      1.1.0
// @description  This userscript aims to enhance your experience at barter.vg
// @match        https://barter.vg/*
// @match        https://wwww.barter.vg/*
// @connect      revadike.ga
// @connect      steamcommunity.com
// @connect      steamtrades.com
// @connect      store.steampowered.com
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @grant        GM_info
// @grant        GM_setClipboard
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-start
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/fuse.js/3.4.4/fuse.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/history.js/1.8/bundled-uncompressed/html4+html5/jquery.history.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/noUiSlider/13.1.5/nouislider.min.js
// @resource     noUiSliderCss https://cdnjs.cloudflare.com/ajax/libs/noUiSlider/13.1.5/nouislider.min.css
// @homepageURL  https://github.com/Revadike/EnhancedBarter/
// @supportURL   https://github.com/Revadike/EnhancedBarter/issues
// @downloadURL  https://github.com/Revadike/EnhancedBarter/raw/master/Enhanced%20Barter.user.js
// @updateURL    https://github.com/Revadike/EnhancedBarter/raw/master/Enhanced%20Barter.user.js
// ==/UserScript==

// ==Code==
"use strict";
const requests = [];
const requestRateLimit = 200;
const localStorage = unsafeWindow.localStorage;
let myuid, mysid, streps, usergroups, itemnames;

function init() {
    setTimeout(initBarter, 0);
}

function initBarter() {
    setInterval(handleRequests, requestRateLimit);

    $.fn.serializeObject = serializeObject;
    $.ajaxSetup({
        "beforeSend": (xhr, options) => {
            showSpinner(options.url);

            xhr.url = options.url;
            const request = () => {
                options.beforeSend = (x, o) => x.url = o.url;
                $.ajax(options);
            };

            requests.push(request);
        },
        "complete": (xhr) => hideSpinner(xhr.url)
    });

    unsafeWindow.$ = $;
    $(document).ready(barterReady);
}

function barterReady() {
    console.log(`[Enhanced Barter] Enhancing`);

    // Every barter page
    setTimeout(ajaxify, 0);
    GM_addStyle(GM_getResourceText(`noUiSliderCss`));
    GM_addStyle(stylesheet);

    $(`li.bottomline`).after(`<li class="bottomline" title="${GM_info.script.name} (${GM_info.script.version}) by ${GM_info.script.author}">
        <a target="_blank" href="https://github.com/Revadike/EnhancedBarter/">
            <span>&#129302;&#xFE0E;</span>${GM_info.script.name}
        </a>
    </li>`);

    streps = JSON.parse(localStorage.stReps || `{}`);
    $(`a:has(>[alt="Steam Trades icon"])`).get().forEach(addSteamTradesRep);

    if ($(`#q`).length > 0) {
        itemnames = JSON.parse(localStorage.itemnames || `{}`);
        addAutoComplete();
    }

    usergroups = JSON.parse(localStorage.usergroups || `{}`);

    // The match page and user profile page
    $(`#tradeUser [label=Groups] option, [name=group] option`).get().forEach((elem) => {
        const id = Math.abs(elem.value);
        const offset = 64; // Char code offset
        const name = usergroups[id >= offset ? id - offset : id];
        if (!name) {
            return;
        }

        elem.innerText = `${elem.innerText} : ${name}`;
    });

    // The match page
    const cats = [`trade`, `wish`];
    const sortings = {};
    cats.forEach((cat) => {
        sortings[cat] = {};
        sortings[cat][`az`] = $(`select#${cat}Game option`).get();

        const initial = sortings[cat].az.shift();
        sortings[cat][`90`] = [...sortings[cat].az].sort((a, b) => parseInt(b.innerText.split(` (`).pop().replace(`)`, ``)) - parseInt(a.innerText.split(` (`).pop().replace(`)`, ``)));

        $(`select#${cat}Game`).after(`
            <div id="${cat}Sort" style="display: inline;">
                <label> Sorted by </label>
                <a data-sort="az" data-selected="1" style="text-decoration: none; font-weight: bold; color: inherit;">A-Z</a>
                <label>/</label>
                <a data-sort="90" data-selected="0" style="cursor: pointer;">9-0</a>
            </div>
        `);

        $(`#${cat}Sort [data-sort]`).click((event) => {
            $(`#${cat}Sort [data-selected="1"]`).attr(`data-selected`, 0).attr(`style`, `cursor: pointer;`);
            $(event.target).attr(`data-selected`, 1).attr(`style`, `text-decoration: none; font-weight: bold; color: inherit;`);

            const sortby = $(event.target).data(`sort`);
            console.log(sortings[cat][sortby][0]);
            $(`select#${cat}Game`).html([initial, ...sortings[cat][sortby]]).val(0);
        });
    });

    // Any bundle page
    if ($(`[accesskey="b"]`).parent().hasClass(`nav-sel`)) {
        $(`.warnings`).append(`<li style="float: right">
            <input id="togglebtn" onsubmit="void(0)" value="Hide/Show" type="button" class="addTo offer bold pborder">
        </li>
        <li style="float: right">
            <select id="toggleselect" title="Select which items you want to hide or show" class="pborderHover">
                <option value="[type=checkbox]:checked">Selected</option>
                <option value=".blist">Blacklist</option>
                <option value=".trad">Tradables</option>
                <option value=".wish">Wishlist</option>
                <option value=".libr">Library</option>
            </select>
        </li>`);

        $(`#togglebtn`).click(toggleBundleItems);
    }

    // The creating offer page
    $(`[name=remove_offer_items]`).val(`－ Remove Selected`).css(`width`, `23.8%`).css(`margin-left`, `-4px`).removeClass(`extraLeft`).after(`<input type="button" value="◧ Invert Selection" style="width: 23.8%; margin-left: 0.5%" class="checkall addTo pborder" onsubmit="void(0)"><input type="button" value="&#128275;&#xFE0E; Enable Locked" style="width: 23.8%; margin-left: 0.5%" class="enableall addTo pborder" onsubmit="void(0)">`);
    $(`[name=add_to_offer]`).val(`+ Add Selected`).css(`width`, `23.8%`).css(`margin-right`, `0.5%`);

    $(`.checkall`).click(checkAllTradables);
    $(`.enableall`).click(enableAllTradables);

    // Every next barter page will have the sign out link
    if ($(`#signin`).length === 0 || $(`abbr+ a:has(.icon)`).length === 0) {
        return;
    }

    myuid = $(`#signin`).attr(`href`).split(`/`)[4];
    mysid = $(`abbr+ a:has(.icon)`).attr(`href`).split(`/`)[4];

    // Every next barter page will be on /u/myuid/
    if (!$(`h1 > a`).is(`[href*="/u/${myuid}"]`)) {
        return;
    }

    // The library page
    if ($(`[accesskey="l"]`).parent().hasClass(`nav-sel`) ) {
        $(`[name="sync_list"]`).after(`<input type="button" title="Sync ALL owned games and DLC" value="↻ Comprehensive Sync with Steam" style="margin-left: 0.5%" id="libsync" class="addTo gborder" onsubmit="void(0)">`);
        $(`#libsync`).click(clickLibSyncBtn);
    }

    // The settings page
    if ($(`.preferences`).length > 0) {
        $(`#offer`).before(`<div id="groups">
            <h3 class="listName sborder">&#x1F46A;&#xFE0E; User Group Names</h3>
            <p>
                <select name="groupid">
                    <option value="1">A</option>
                    <option value="2">B</option>
                    <option value="3">C</option>
                    <option value="4">D</option>
                    <option value="5">E</option>
                    <option value="6">F</option>
                    <option value="7">G</option>
                    <option value="8">H</option>
                    <option value="9">I</option>
                    <option value="10">J</option>
                    <option value="11">K</option>
                    <option value="12">L</option>
                    <option value="13">M</option>
                    <option value="14">N</option>
                    <option value="15">O</option>
                    <option value="16">P</option>
                    <option value="17">Q</option>
                    <option value="18">R</option>
                    <option value="19">S</option>
                    <option value="20">T</option>
                    <option value="21">U</option>
                    <option value="22">V</option>
                    <option value="23">W</option>
                    <option value="24">X</option>
                    <option value="25">Y</option>
                    <option value="26">Z</option>
                </select>
                <input type="text" name="groupname" placeholder="E.g. Unowned collectors">
                <input type="button" value="Save" id="savegroup" class="addTo dborder">
            </p>
        </div>`);

        $(`#savegroup`).click((event) => {
            event.preventDefault();
            const id = $(`[name=groupid]`).val();
            const name = $(`[name=groupname]`).val();
            usergroups[id] = name;
            localStorage.usergroups = JSON.stringify(usergroups);
        });

        $(`[name=groupid]`).change((event) => {
            const id = event.target.value;
            $(`[name=groupname]`).val(usergroups[id]);
        });

        $(`[name=groupid]`).trigger(`change`);
    }

    // The offer overview page
    if ($(`li:has([accesskey="o"])`).is(`.nav-sel`) && $(`.activity`).length > 0) {
        $(`input.offer`).after(`<input id="automatedoffer" onsubmit="void(0)" value="Begin Automated Offer" class="addTo offer bold pborder" type="button" style="float: right;">`);
        $(`#automatedoffer`).parents(`form`).css(`width`, `100%`);
        $(`#automatedoffer`).click(setupAutomatedOffer);
        $(`.showMoreArea`).last().after(`<p>
            <label for="offersearch">
                <strong>Filter: </strong>
            </label>
            <input class="addTo pborder" id="offersearch" type="text" placeholder="Search in displayed offers..." style="width: 210px;">
            <input class="addTo pborder" style="float: right; margin-left: 4px;" id="canceloffers" type="button" onsubmit="void(0)" value="Cancel Offers">
            <input class="addTo pborder" style="float: right; margin-left: 4px;" id="messageoffers" type="button" onsubmit="void(0)" value="Message Offers">
            <input class="addTo pborder" style="float: right; margin-left: 4px;" id="extendoffers" type="button" onsubmit="void(0)" value="Change Expiration">
        </p>`);

        $(`#canceloffers`).click(cancelOffers);
        $(`#messageoffers`).click(messageOffers);
        $(`#extendoffers`).click(extendExpiry);
        $(`#offersearch`).on(`change keyup paste`, searchOffers);
    }

    // The accepted offer page
    $(`input[value='Completed Offer']`).click(finalizeOffer);
}

function clickLibSyncBtn(event) {
    event.preventDefault();
    showSpinner(`libsync`);
    $(event.target).prop(`disabled`, true).val(`↻ Syncing...`);
    syncLibrary(() => {
        hideSpinner(`libsync`);
        $(event.target).prop(`disabled`, false).val(`✔ Done`);
    });
}

function showSpinner(instanceid) {
    if ($(`.spinner`).length === 0) { // to avoid multiple spinners
        $(`body`).prepend(`<div class="spinner"></div>`);
    }

    $(`.spinner`).attr(`data-instanceid`, instanceid);
}

function hideSpinner(instanceid) {
    $(`.spinner[data-instanceid='${instanceid}']`).remove();
}

function enableAllTradables(event) {
    event.preventDefault();

    if (!confirm(`Are you sure you want to enable disabled tradables? Make sure the other party is okay with this!`)) {
        return;
    }

    $(event.target).parents(`.tradables`).find(`.collectionSelect input[disabled]`).get().forEach((elem) => {
        elem.removeAttribute(`disabled`);
        elem.removeAttribute(`title`);
        elem.name = `add_to_offer_${$(`.enableall:first`).is(event.target) ? `1` : `2`}[]`;
        elem.id = $(elem).find(`+`).attr(`for`);
        elem.value = `${$(elem).parents(`tr`).data(`item-id`)},${$(elem).next().attr(`for`).replace(`edit`, ``)}`;
    });

    $(event.target).remove();
}

function checkAllTradables(event) {
    event.preventDefault();
    $(event.target).parents(`.tradables`).find(`.collectionSelect input[type=checkbox]`).get().forEach((elem) => elem.checked = !elem.checked);
}

function toggleBundleItems(event) {
    event.preventDefault();
    $(`.collection tbody > tr:has(${$(`#toggleselect`).val()}):not(:has(.bargraphs))`).toggle();
    $(`.collection tbody > tr:visible [type=checkbox]`).prop(`disabled`, false);
    $(`.collection tbody > tr:hidden [type=checkbox]`).prop(`disabled`, true);
}

function createRep(rep) {
    if (rep && isFinite(rep.m) && isFinite(rep.p)) {
        return `<span class="strep" title="Steam Trades score">( <span class="plus">+${rep.p}</span>, <span class="minus${rep.m !== 0 ? ` hasMinus` : ``}">${rep.m}</span> )</span>`;
    }

    return $(`<span class="strep notfound">( none )</span>`);
}

function addSteamTradesRep(elem) {
    const steamid = elem.href.split(`/`)[4];

    if (streps[steamid] && streps[steamid].t && Date.now() - streps[steamid].t <= 48 * 60 * 60 * 1000) {
        $(elem).after(createRep(streps[steamid]));
        return;
    }

    request({
        "method": `GET`,
        "url": elem.href,
        "onload": (response) => {
            streps[steamid] = {};
            const plus = parseInt($(`.increment_positive_review_count`, response.responseText).first().text().replace(`,`, ``));
            const minus = parseInt($(`.increment_negative_review_count`, response.responseText).first().text().replace(`,`, ``));

            if (!isNaN(plus) && !isNaN(minus)) {
                streps[steamid].p = plus;
                streps[steamid].m = minus;
            }

            streps[steamid].t = Date.now();
            localStorage.stReps = JSON.stringify(streps);
            $(elem).after(createRep(streps[steamid]));
        }
    });
}

function addAutoComplete() {
    if (Date.now() - itemnames.lastupdated <= 24 * 60 * 60 * 1000) {
        const data = Object.entries(itemnames.data).map((e) => ({ "id": e[0], "title": e[1] }));
        // eslint-disable-next-line no-undef
        const fuse = new Fuse(data, {
            "shouldSort": true,
            "threshold": 0.3,
            "maxPatternLength": 32,
            "minMatchCharLength": 2,
            "keys": [`id`, `title`]
        });

        let delay;
        $(`#q`).parent().append(`<div id="acbox" class="autocomplete"></div>`);
        $(`#q`).on(`change keyup paste`, (event) => {
            clearTimeout(delay);
            showSpinner(`autocomplete`);
            delay = setTimeout(() => {
                const val = event.target.value.trim();
                $(`#acbox`).html(``);
                hideSpinner(`autocomplete`);

                if (val.length <= 2) {
                    return;
                }

                const results = fuse.search(val);
                for (let i = 0; i < 10; i++) {
                    const item = results.shift();
                    if (item) {
                        $(`#acbox`).append(`<p style="margin: 0.5em;"><a href="/i/${item.id}/">${item.title}</a></p>`);
                    }
                }

                if (results.length === 0) {
                    return;
                }

                $(`#acbox`).append(`<strong style="margin: 0.5em;"><a href="/search?q=${encodeURIComponent(val)}">And ${results.length} more...</a></strong>`);
            }, 500);
        }).blur(() => setTimeout(() => $(`#acbox`).hide(), 200)).focus(() => $(`#acbox`).show());
        return;
    }

    request({
        "method": `GET`,
        "url": `https://barter.vg/browse/json/`,
        "onload": (response) => {
            let json;
            try {
                json = JSON.parse(response.responseText);
            } catch (e) {
                return;
            }

            itemnames.data = {};
            for (const id in json) {
                itemnames.data[id] = json[id].title.trim();
            }

            itemnames.lastupdated = Date.now();
            localStorage.itemnames = JSON.stringify(itemnames);
            addAutoComplete();
        }
    });
}

function handleRequests() {
    if (requests.length === 0) {
        return;
    }

    if (requests.length === 1) {
        setTimeout(() => console.log(`All ajax requests are served!`), requestRateLimit);
    }

    console.log(`${requests.length} Ajax requests remaining...\nThis will roughly take ${requests.length * requestRateLimit / 1000} seconds to complete.`);
    const req = requests.shift();
    if (typeof request === `function`) {
        req();
    }
}

function finalizeOffer(event) {
    event.preventDefault();

    const main = $(event.target).parents(`#main`);
    const steamid = $(`#offerHeader [alt="Steam icon"]`, main).get().map((elem) => elem.title).find((id) => id !== mysid);
    const name = $(`#offerHeader tr:has([title="${steamid}"]) > td:nth-child(2) > strong > a`, main).text();
    const form = $(event.target).parents(`form`);
    const url = form.attr(`action`).split(`#`)[0];
    const msg = `＋REP ${name} is an amazing trader, recommended! We successfully completed this trade: ${url}. Thanks a lot for the trade!`;

    $(event.target).val(`Completing trade, sending feedback and syncing library...`).prop(`disabled`, true);
    $.post(url, form.serializeObject());
    showSpinner(`feedback`);

    setPostTradeClipboard(url);
    postSteamTradesComment(msg, steamid, () => syncLibrary(() => location.href = url));
}

async function syncLibrary(callback) {
    if (callback) {
        await syncLibrary().catch(callback);
        callback();
        return;
    }

    return new Promise(async(res, rej) => {
        await request({
            "url": `https://barter.vg/u/${myuid}/l/`,
            "method": `POST`,
            "headers": {
                "Content-Type": `application/x-www-form-urlencoded`
            },
            "data": $.param({
                "sync_list": `↻ Sync List`,
                "type": 1
            })
        }).catch(rej);

        const response = await request({
            "method": `GET`,
            "url": `http://store.steampowered.com/dynamicstore/userdata/?t=${Date.now()}`
        }).catch(rej);

        const json = JSON.parse(response.responseText);
        const ownedApps = json.rgOwnedApps;
        const ownedPackages = json.rgOwnedPackages;
        await request({
            "url": `https://barter.vg/u/${myuid}/l/e/`,
            "method": `POST`,
            "headers": {
                "Content-Type": `application/x-www-form-urlencoded`
            },
            "data": $.param({
                "bulk_IDs": `app/${ownedApps.join(`,app/`)},sub/${ownedPackages.join(`,sub/`)}`,
                "add_IDs": `+ Add IDs`,
                "action": `Edit`,
                "change_attempted": 1,
                "add_from": `IDs`
            })
        }).catch(rej);

        res();
    });
}

async function postSteamTradesComment(msg, steamid, callback) {
    const empty = () => {};
    callback = callback || empty;

    const response = await request({
        "method": `GET`,
        "url": `https://www.steamtrades.com/user/${steamid}`,
        "headers": {
            "Accept": `text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3`,
            "Accept-Encoding": `gzip, deflate, br`,
            "Accept-Language": `en`
        }
    }).catch(callback);

    const profile_id = $(`[name=profile_id]`, response.responseText).val();
    const xsrf_token = $(`[name=xsrf_token]`, response.responseText).val();
    if (!profile_id || !xsrf_token) {
        callback();
        return;
    }

    const data = {
        "do": `review_insert`,
        "xsrf_token": xsrf_token,
        "profile_id": profile_id,
        "rating": 1,
        "description": msg
    };

    await request({
        "method": `POST`,
        "url": `https://www.steamtrades.com/ajax.php`,
        "data": $.param(data),
        "headers": {
            "Content-Type": `application/x-www-form-urlencoded; charset=UTF-8`,
            "Accept": `application/json, text/javascript, */*; q=0.01`,
            "Accept-Encoding": `gzip, deflate, br`,
            "Accept-Language": `en`
        }
    }).catch(callback);

    callback();
}

function setPostTradeClipboard(url) {
    const sgprofile = `https://www.steamtrades.com/user/${mysid}`;
    const msg = `Thanks for the trade!\nI completed the trade on barter.vg and left feedback on your steamtrades profile.\nIf you haven't done so already, could you please do the same?\n${url}\n${sgprofile}`;
    GM_setClipboard(msg);
}

function setupAutomatedOffer() {
    $.post(`/u/${myuid}/o/`, {
        "to_user_id": -2,
        "offer_setup": 1
    }, (data) => {
        $.post($(`[rel=canonical]`, `<div>${data}</div>`).attr(`href`), {
            "offer_setup": 3,
            "cancel_offer": `☒ Cancel Offer`
        });

        parseHtml(data);
        $(`#main h2`).html(`&#x1F916;&#xFE0E;✉ Automated Offers`);
        $(`#offerHeaderTo`).html(`To <strong>Qualified Users</strong> (select options below)`);
        $(`#offerHeaderTo`).parent().next().remove();
        $(`#offer`).replaceWith(`<form id=offer>${$(`#offer`).html()}</form>`);
        $(`[name=cancel_offer]`).replaceWith(`<input class="addTo failed" value="🗑 Cancel and Discard Offer" type="button" onclick="location.reload()">`);
        $(`.tradables:nth-child(3) legend`).html(`${$(`.tradables:nth-child(3) legend`).html().replace(`<strong class="midsized offer">1</strong> of `, `<input min="1" id="from_ratio" name="from_ratio" type="number" value="1" style="width: 40px;"> of `)}...`);

        $(`form[action*=comments]`).remove();
        $(`.noborder:nth-child(3)`).nextAll().remove();
        $(`.collectionSelect`).nextAll().remove();
        $(`#exchanges`).nextAll().remove();
        $(`#offer`).nextAll().remove();

        $(`.tradables`).after(`
        <ul>
        ...to users who...
            <li> <input type="checkbox" name="offering_to" id="towishlist" value="wishlist" checked="true"> <label for="towishlist">...have them in their wishlist...</label></li>
            <li> <input type="checkbox" name="offering_to" id="tounowned" value="unowned" checked="true"> <label for="tounowned">...do <strong>not</strong> have them in their libary...</label></li>
            <!-- <li> <input type="checkbox" name="offering_to" id="tolibary" value="libary"> <label for="tolibary">...have them in their libary...</label></li> -->
            <li> <input type="checkbox" name="offering_to" id="totradable" value="tradable"> <label for="totradable">...have them for trade...</label></li>
        </ul>
        <div style="margin: 2em 0; border-top: 1px solid rgb(153, 17, 187); border-bottom: 1px solid rgb(153, 17, 187);" class="offerDivide">
            <strong class="midsized">⇅</strong> ...in exchange for...
        </div>
        <p>
            ... <input min="1" id="to_ratio" name="to_ratio" type="number" value="1" style="width: 40px;"> of their tradables meeting these requirements...
        </p>
        <fieldset style="border-top: 1px solid rgb(153, 17, 187);">
            <div id="limit" data-max="10000" class="offerSlider"></div>
            Offers (<a style="cursor: help; text-decoration: none;" title="The number range of offers you want to send. Note that barter has a daily limit.">?</a>)
        </fieldset>
        <fieldset>
            <div id="DLC" data-max="1" class="offerSlider"></div>
            Include DLC (<a style="cursor: help; text-decoration: none;" title="Include DLC?">?</a>)
        </fieldset>
        <fieldset>
            <div id="givenaway" data-max="1" class="offerSlider"></div>
            Include given away (<a style="cursor: help; text-decoration: none;" title="Include games that are free or have been given away before?">?</a>)
        </fieldset>
        <fieldset>
            <div id="bundles" data-max="100" class="offerSlider"></div>
            Bundles count (<a style="cursor: help; text-decoration: none;" title="The number range of the game bundle count. Choose range 0-0 to only want never bundled games. Choose range 1-max to avoid never-bundled games.">?</a>)
        </fieldset>
        <fieldset>
            <div id="cards" data-max="100" class="offerSlider"></div>
            Cards count (<a style="cursor: help; text-decoration: none;" title="The number range of the game card count. Choose range 0-0 to only want games with no cards.">?</a>)
        </fieldset>
        <fieldset>
            <div id="achievements" data-max="1000000" class="offerSlider"></div>
            Achievements count (<a style="cursor: help; text-decoration: none;" title="The number range of the achievement count of a tradable. Choose range 0-0 to only want games with no achievements.">?</a>)
        </fieldset>
        <fieldset>
            <div id="reviews" data-max="1000000" class="offerSlider"></div>
            Review count (<a style="cursor: help; text-decoration: none;" title="The number range of the game review count. Choose range 0-0 to only want games with no reviews.">?</a>)
        </fieldset>
        <fieldset>
            <div id="scores" data-max="100" data-suffix="%" class="offerSlider"></div>
            Review score (<a style="cursor: help; text-decoration: none;" title="The percentage range of the game review score">?</a>)
        </fieldset>
        <fieldset>
            <div id="price" data-max="10000" data-prefix="$" class="offerSlider"></div>
            Price (<a style="cursor: help; text-decoration: none;" title="The price range of the game">?</a>)
        </fieldset>
        <fieldset>
            <div id="wishlist" data-max="10000" class="offerSlider"></div>
            Wishlist count (<a style="cursor: help; text-decoration: none;" title="The range of wishlist count, the number of Barter.vg users that have the game in their wishlist">?</a>)
        </fieldset>
        <fieldset>
            <div id="library" data-max="10000" class="offerSlider"></div>
            Library count (<a style="cursor: help; text-decoration: none;" title="The range of library count, the number of Barter.vg users that have the game in their library">?</a>)
        </fieldset>
        <fieldset style="border-bottom: 1px solid rgb(153, 17, 187);">
            <div id="tradables" data-max="10000" class="offerSlider"></div>
            Tradables count (<a style="cursor: help; text-decoration: none;" title="The range of tradables count, the number of Barter.vg users that have the game to trade">?</a>)
        </fieldset>
        <p style="float: left;">...from these platforms...</p>
        <p style="margin-left: 50%;">...from users who...</p>
        <div style="width: 50%; float: right; height: 14em; overflow: auto; border-top: 1px solid rgb(153, 17, 187); border-bottom: 1px solid rgb(153, 17, 187);">
            <ul>
                <li> <input type="checkbox" name="want_from" id="wantwishlist" value="wishlist" checked="true"> <label for="wantwishlist">...have those tradables in your wishlist.</label></li>
                <li> <input type="checkbox" name="want_from" id="wantunowned" value="unowned" checked="true"> <label for="wantunowned">...do <strong>not</strong> have those tradables in your libary.</label></li>
                <li> <input type="checkbox" name="want_from" id="wantlibary" value="libary"> <label for="wantlibary">...have those tradables in your libary.</label></li>
                <li> <input type="checkbox" name="want_from" id="wanttradable" value="tradable"> <label for="wanttradable">...have those tradables in your tradables list.</label></li>
            </ul>
        </div>
        <div style="width: 50%; height: 14em; overflow: auto; border-top: 1px solid rgb(153, 17, 187); border-bottom: 1px solid rgb(153, 17, 187);">
            <ul>
                <li><input type="checkbox" name="platform" id="steam" value="1" checked="true"><label for="steam">Steam</label></li>
                <li><input type="checkbox" name="platform" id="steampkg" value="2"><label for="steampkg">Steam Package</label></li>
                <li><input type="checkbox" name="platform" id="hb" value="3"><label for="hb">Humble Bundle</label></li>
                <li><input type="checkbox" name="platform" id="gog" value="4"><label for="gog">GOG.com</label></li>
                <li><input type="checkbox" name="platform" id="origin" value="5"><label for="origin">Origin</label></li>
                <li><input type="checkbox" name="platform" id="desura" value="6"><label for="desura">Desura</label></li>
                <li><input type="checkbox" name="platform" id="groupees" value="9"><label for="groupees">Groupees</label></li>
                <li><input type="checkbox" name="platform" id="gamersgate" value="11"><label for="gamersgate">GamersGate</label></li>
                <li><input type="checkbox" name="platform" id="hbstore" value="13"><label for="hbstore">Humble Store</label></li>
                <li><input type="checkbox" name="platform" id="uplay" value="14"><label for="uplay">Uplay</label></li>
                <li><input type="checkbox" name="platform" id="n3ds" value="25"><label for="n3ds">Nintendo 3DS</label></li>
                <li><input type="checkbox" name="platform" id="wiiu" value="26"><label for="wiiu">WiiU</label></li>
                <li><input type="checkbox" name="platform" id="itchio" value="28"><label for="itchio">itch.io</label></li>
                <li><input type="checkbox" name="platform" id="tellate" value="32"><label for="tellate">Telltale Games</label></li>
                <li><input type="checkbox" name="platform" id="greenlight" value="35"><label for="greenlight">Steam Greenlight</label></li>
                <li><input type="checkbox" name="platform" id="squareenix" value="37"><label for="squareenix">Square Enix</label></li>
                <li><input type="checkbox" name="platform" id="ps4" value="51"><label for="ps4">PlayStation 4</label></li>
                <li><input type="checkbox" name="platform" id="ps3" value="52"><label for="ps3">PlayStation 3</label></li>
                <li><input type="checkbox" name="platform" id="x360" value="53"><label for="x360">Xbox 360</label></li>
                <li><input type="checkbox" name="platform" id="xbone" value="54"><label for="xbone">Xbox One</label></li>
                <li><input type="checkbox" name="platform" id="unknown" value="61"><label for="unknown">Unspecified Platform</label></li>
                <li><input type="checkbox" name="platform" id="twitch" value="67"><label for="twitch">Twitch</label></li>
                <li><input type="checkbox" name="platform" id="psvita" value="77"><label for="psvita">PSVita</label></li>
                <li><input type="checkbox" name="platform" id="psn" value="78"><label for="psn">PSN</label></li>
                <li><input type="checkbox" name="platform" id="bnet" value="80"><label for="bnet">battle.net</label></li>
                <li><input type="checkbox" name="platform" id="fangamer" value="84"><label for="fangamer">Fangamer</label></li>
                <li><input type="checkbox" name="platform" id="ht" value="85"><label for="ht">Humble Trove</label></li>
                <li><input type="checkbox" name="platform" id="rsc" value="112"><label for="rsc">Rockstar Social Club</label></li>
                <li><input type="checkbox" name="platform" id="oculus" value="129"><label for="oculus">Oculus</label></li>
            </ul>
        </div>`);

        $(`#offerStatus`).html(`<div class="statusCurrent">Creating...</div><div class="">Preparing...</div><div class="">Sending offers...</div><div class="">Completed</div>`);
        $(`#offer`).prepend(`<div>
            <textarea class="offer_message" name="message" id="offerMessage" placeholder="Add a public comment to automated offers that is relevant and respectful" title="optional public comment up to 255 characters" maxlength="255" style="width: 100%;"></textarea>
        </div>`);

        $(`#from_ratio`).attr(`max`, $(`.tradables input`).length);
        $(`.tradables input[type=checkbox]`).click(() => {
            const n = $(`.tradables input:checked`).length;
            $(`#from_ratio`).attr(`max`, n || 1);
            $(`#from_ratio`).val(Math.min(n, parseInt($(`#from_ratio`).val())));
        });
        $(`#from_ratio`).change(() => $(`#from_ratio`).val(Math.min(parseInt($(`#from_ratio`).attr(`max`)), parseInt($(`#from_ratio`).val()))));

        $(`#exchanges`).nextAll().remove();
        $(`[name=offer_setup]`).remove();
        $(`#exchanges`).after(`
        <p>
            <label for="expire_days">Offer expires in </label>
            <select name="expire_days" id="expire_days">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
                <option value="7">7</option>
                <option value="8">8</option>
                <option value="9">9</option>
                <option value="10">10</option>
                <option value="11">11</option>
                <option value="12">12</option>
                <option value="13">13</option>
                <option value="14">14</option>
                <option selected="selected">15</option>
            </select>
            days.
        </p>
        <p>
            <label for="counter_preference">Counter offer is </label>
            <select name="counter_preference" id="counter_preference">
                <option value="-1">Discouraged, don't display counter</option>
                <option value="0" selected="selected">OK, display counter</option>
                <option value="1">Encouraged, bold counter</option>
            </select>
            .
        </p>
        <p>
            <input type="checkbox" name="synclib" id="synclib" value="true" checked><label for="synclib">Synchronize your <a target="_blank" href="/u/${myuid}/l/">barter library</a> with <a target="_blank" href="https://store.steampowered.com/dynamicstore/userdata/">steam store userdata</a> first (RECOMMENDED).</label>
        </p>
        <p><button id="massSendBtn" class="addTo gborder acceptOption" style="font-weight: bold; color: green; width: 100%; height: 2em; font-size: 1.2em; cursor: pointer;">Finish and Send Automated Offers</button>`);
        $(`#massSendBtn`).click((event) => {
            event.preventDefault();
            sendAutomatedOffers();
            return false;
        });
        $(`[name='add_to_offer_1[]']`).attr(`name`, `offering`);
        $(`#offerStatus+ div`).remove();
        $(`#offerStatus`).attr(`style`, `border-top: 1px solid rgb(153, 17, 187); border-bottom: 1px solid rgb(153, 17, 187);`);

        $(`.offerSlider`).get().forEach((slider) => {
            const max = parseInt($(slider).data(`max`)) || 1000;
            const digits = max.toString().split(``).length;
            const prefix = $(slider).data(`prefix`) || ``;
            const suffix = $(slider).data(`suffix`) || ``;
            const isToggle = max === 1;

            if (isToggle) {
                $(slider).after(`<input type="hidden" value="true" name="${slider.id}">`);
            } else {
                $(slider).after(`<input type="hidden" value="0" name="min${slider.id}">`);
                $(slider).after(`<input type="hidden" value="${max}" name="max${slider.id}">`);
            }

            const toggleTooltip = (val) => {
                if (max === 1) {
                    return val ? `Yes` : `No`;
                }

                return `${prefix}${val.toFixed(0)}${suffix}`;
            };

            const range = {
                "min": 0,
                "max": max
            };

            let percentage = 0;
            for (let i = 1; i <= digits - 1; i++) {
                percentage += 100 / (digits - 1);
                range[`${percentage}%`] = Math.pow(10, i);
            }

            // eslint-disable-next-line no-undef
            noUiSlider.create(slider, {
                "start": isToggle ? max : [0, max],
                "connect": !isToggle,
                "behaviour": isToggle ? `none` : `drag-tap`,
                "tooltips": [{ "to": toggleTooltip }].concat(isToggle ? [] : [{ "to": toggleTooltip }]),
                "step": 1,
                "range": range
            }).on(`update`, (values) => {
                if (isToggle) {
                    const value = parseInt(values[0]);
                    $(`[name="${slider.id}"]`).val(Boolean(value));
                    if (value) {
                        $(slider).addClass(`on`);
                    } else {
                        $(slider).removeClass(`on`);
                    }
                } else {
                    $(`[name="min${slider.id}"]`).val(values[0]);
                    $(`[name="max${slider.id}"]`).val(values[1]);
                }
            });

            if (isToggle) {
                $(slider).find(`.noUi-connects`).click(() => slider.noUiSlider.set(parseInt(slider.noUiSlider.get()) ? 0 : 1));
            }
        });
    });
}

function checkSettings(settings) {
    if (!settings) {
        settings = $(`#offer`).serializeObject();
    }

    settings = fixObjectTypes(settings);

    if (!settings.offering) {
        alert(`Please select ${settings.from_ratio} or more of your tradable(s) that you want to offer.`);
        return;
    }

    if (!settings.offering_to) {
        alert(`Please select 1 or more trader groups you want to sent offers to.`);
        return;
    }

    if (!settings.want_from) {
        alert(`Please select 1 or more tradable groups you want to ask tradables from.`);
        return;
    }

    if (!settings.platform) {
        alert(`Please select 1 or more platform(s) you want to ask tradables from.`);
        return;
    }

    if (settings.message && settings.message.length > 255) {
        alert(`Please limit your message to only 255 characters.`);
        return;
    }

    if (!confirm(`Are you sure you want to proceed? Beware that this may cause traders to add you to their ignore list!`)) {
        return;
    }

    settings.offering = Array.isArray(settings.offering) ? settings.offering : [settings.offering];
    settings.offering_to = Array.isArray(settings.offering_to) ? settings.offering_to.map((g) => g.toLowerCase()) : [settings.offering_to.toLowerCase()];
    settings.want_from = Array.isArray(settings.want_from) ? settings.want_from.map((g) => g.toLowerCase()) : [settings.want_from.toLowerCase()];
    settings.platform = Array.isArray(settings.platform) ? settings.platform : [settings.platform];

    if (settings.offering.length < settings.from_ratio) {
        alert(`Please select ${settings.from_ratio} or more of your tradable(s) that you want to offer.`);
        return;
    }

    if (settings.offering.length > 30) {
        alert(`Please select 30 or less of your tradable(s) that you want to offer.`);
        return;
    }

    return settings;
}

function logHTML(log) {
    console.log(log);
    $(`#log`).append(`<p>${log}</p>`);
}

function changeAutomatedOfferStatus(i) {
    [1, 2, 3, 4].forEach((n) => $(`#offerStatus > div:nth-child(${n})`).removeClass(`statusCurrent`));
    $(`#offerStatus > div:nth-child(${i})`).addClass(`statusCurrent`);
}

function calculateStupidDailyLimit(offers) {
    const unique = [];
    for (const id in offers) {
        const offer = offers[id];
        if (offer.from_status !== `completed` || offer.to_status !== `completed`) {
            continue;
        }

        const otherparty = offer.to_user_id === myuid ? offer.from_user_id : offer.to_user_id;
        if (unique.includes(otherparty)) {
            continue;
        }

        unique.push(otherparty);
    }

    const daylength = 24 * 60 * 60 * 1000;
    const recent = [];
    for (const id in offers) {
        const offer = offers[id];
        if (offer.from_user_id === myuid && offer.created * 1000 > Date.now() - daylength && offer.to_status !== `completed` && offer.from_status !== `cancelled`) {
            recent.push(id);
        }
    }

    return (unique.length < 100 ? 200 : 400) - recent.length;
}

async function sendAutomatedOffers(options) {
    const settings = checkSettings(options);
    console.log(`settings`, settings);

    if (!settings) {
        return;
    }

    changeAutomatedOfferStatus(2);
    $(`#offer`).replaceWith(`<div style="height: 28em; overflow: auto; border-bottom: 1px solid rgb(153, 17, 187);" id="log"></div>`);
    showSpinner(`automatedoffers`);

    let offers = await getBarterOffers(parseInt(myuid, 16));
    let dailylimit = calculateStupidDailyLimit(offers); // barter's stupid daily offer limit

    if (dailylimit <= 0) {
        logHTML(`<strong>Cancelled, because you hit/exceeded <a target="_blank" href="/u/a0/">barter.vg</a>'s daily offer limit...<br>Help him convince to remove this limit by complaining to him!</strong>`);
        return;
    }

    if (settings.synclib) {
        logHTML(`Syncing your <a target="_blank" href="/u/${myuid}/l/">barter library</a> with your <a target="_blank" href="https://store.steampowered.com/dynamicstore/userdata/">steam user data</a>...`);
        await syncLibrary().catch((err) => {
            console.log(err);
            alert(err.message || err.name);
        });
    }

    logHTML(`Getting list of users that opted out for automated offers..`);
    const optins = await getBarterAppSettings(2);
    console.log(`optins`, optins);

    logHTML(`Getting info about the tradables you are offering...`);
    const allmatches = {};
    const mytradables = {};
    for (const i of settings.offering) {
        mytradables[i] = await getBarterItemInfo(i.split(`,`)[0]);
    }

    console.log(`mytradables`, mytradables);
    for (const key in mytradables) {
        mytradables[key].matches = new Set(); // the users that want this tradable
        const gameinfo = mytradables[key];

        logHTML(`Limiting traders that potentionally want <a target="_blank" href="/i/${gameinfo.id}/">this tradable</a>, according to their preferences...`);

        settings.offering_to.forEach((group) => {
            if (!gameinfo.users.hasOwnProperty(group)) {
                return;
            }

            for (const userid in gameinfo.users[group]) { // for every user in that group
                if (!gameinfo.users[group].hasOwnProperty(userid)) {
                    continue;
                }

                const uid = parseInt(userid);
                const user = gameinfo.users[group][userid];
                if (passesTheirPreferences(gameinfo, user, optins, group, settings.offering.length, settings.expire_days)) {
                    mytradables[key].matches.add(uid);
                    allmatches[uid] = user;
                    allmatches[uid].want = new Set();
                }
            }
        });
    }

    for (const userid in allmatches) {
        const uid = parseInt(userid);
        const offeringcount = Object.values(mytradables).filter((tradable) => tradable.matches.has(uid)).length; // the amount of tradables I can offer that user
        const pendingusers = Object.values(offers).filter((offer) => offer.from_user_id === myuid && offer.to_status === `pending`).map((offer) => parseInt(offer.to_user_id, 16));

        // if I can't offer enough (according to my options)
        // or if I exceed the user's max items per offer setting
        // or if I already have a pending offer sent to the user
        // then delete match
        if (offeringcount < settings.from_ratio || offeringcount > allmatches[uid].max_items_per_offer || pendingusers.includes(uid)) {
            delete allmatches[uid];
            for (const k in mytradables) {
                mytradables[k].matches.delete(uid);
            }
        }
    }

    const matchedcount = Object.keys(allmatches).length;
    logHTML(`Found ${matchedcount} matching traders!`);
    console.log(`allmatches`, allmatches);
    if (matchedcount === 0) {
        logHTML(`Done!`);
        changeAutomatedOfferStatus(4);
        hideSpinner(`automatedoffers`);
        return;
    }

    logHTML(`Limiting traders that have tradables you want, according to your preferences...${matchedcount > 100 ? `<br><strong>This may take several minutes</strong>` : ``}`);
    for (const userid in allmatches) { // gonna filter out the matches that have no tradables that interest me
        const uid = parseInt(userid);

        const groups = await getFilteredTradables(uid); // the user's tradables filtered according to my collections
        const want_items = [].concat(...settings.want_from.map((group) => groups[group])); // array of item id's of tradables I (still) want from this user

        if (want_items.length === 0) { // if user has no tradables I'm interested in, delete match
            delete allmatches[uid];
            for (const key in mytradables) {
                mytradables[key].matches.delete(uid);
            }
            continue;
        }

        const theirtradables = await getBarterTradables(uid);
        const no_offers_items = Object.keys(theirtradables.tags).length > 0 ? Object.values(Object.assign(...Object.values(theirtradables.tags))).filter((tag) => tag.tag_id === 369).map((tag) => tag.line_id) : [];

        for (const platformid in theirtradables.by_platform) {
            const tradables = theirtradables.by_platform[platformid];
            Object.keys(tradables).forEach((line_id) => {
                const tradable = tradables[line_id];
                if (passesMyPreferences(tradable, settings, want_items, parseInt(platformid)) && !no_offers_items.includes(tradable.line_id)) {
                    allmatches[uid].want.add(`${tradable.item_id},${tradable.line_id}`);
                }
            });
        }

        if (allmatches[uid].want.size < parseInt(settings.to_ratio) || allmatches[uid].want.size === 0) {
            delete allmatches[uid];
            for (const key in mytradables) {
                mytradables[key].matches.delete(uid);
            }
            continue;
        }
    }

    logHTML(`Found ${Object.keys(allmatches).length} matching traders!`);

    if (Object.keys(allmatches).length < settings.minlimit) {
        logHTML(`Not enough matches found. Done!`);
        changeAutomatedOfferStatus(4);
        hideSpinner(`automatedoffers`);
        return;
    }

    const max = Math.min(settings.maxlimit, Object.keys(allmatches).length);
    logHTML(`Sending ${max} automated offers...`);
    changeAutomatedOfferStatus(3);

    let sent = 0;
    let failed = 0;
    const matches = shuffle(Object.keys(allmatches)).slice(0, max); // the users to send the automated offers to
    for (const userid of matches) {
        if (sent === dailylimit) {
            const daylength = 24 * 60 * 60 * 1000 + 10000; // 24h + 10 seconds
            const endtime = Date.now() + daylength;
            const countdown = setInterval(() => {
                const distance = endtime - Date.now();

                if (distance < 0) {
                    clearInterval(countdown);
                    return;
                }

                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor(distance % (1000 * 60 * 60 * 24) / (1000 * 60 * 60));
                const minutes = Math.floor(distance % (1000 * 60 * 60) / (1000 * 60));
                const seconds = Math.floor(distance % (1000 * 60) / 1000);

                $(`.countdown`).html(`${days}d ${hours}h ${minutes}m ${seconds}s`);
            }, 1000);

            logHTML(`<strong>Now we have to wait <i class="countdown"></i> before sending the remaining ${matches.length - failed - sent} offers, because <a target="_blank" href="/u/a0/">barter.vg</a> thinks this limit is neccesary...<br>Help him change his mind by complaining to him!</strong>`);

            await delay(daylength); // wait an entire day, because barter thinks it's neccesary

            offers = await getBarterOffers(parseInt(myuid, 16));

            dailylimit = sent + calculateStupidDailyLimit(offers); // barter's stupid daily offer limit
        }

        const uid = parseInt(userid);
        const ato1 = shuffle(Object.keys(mytradables).filter((key) => mytradables[key].matches.has(uid))); // only add my offered tradables that the user actually wants
        const ato2 = shuffle([...allmatches[uid].want]).splice(0, 30); // max 30 hardcoded: any more than 30 games will be blocked serverside

        const offer = await sendBarterOffer({
            "to": uid,
            "from_and_or": settings.from_ratio === ato1.length ? 0 : settings.from_ratio,
            "to_and_or": settings.to_ratio,
            "expire": settings.expire_days,
            "counter_preference": settings.counter_preference,
            "add_to_offer_from[]": ato1,
            "add_to_offer_to[]": ato2,
            "message": settings.message || ``
        }).catch((err) => {
            failed++;
            logHTML(`<strong>Failed to send automated offer to <a target="_blank" href="/u/${uid.toString(16)}/">${allmatches[uid].steam_persona}</a></strong> (${(sent)}/${max} sent${failed > 0 ? `, ${failed} failed` : ``})`);
            console.log(err);
        });

        if (offer) {
            sent++;
            logHTML(`Successfully sent automated <a target="_blank" href="/u/${myuid}/o/${offer.offer_id}/">offer</a> to <a target="_blank" href="/u/${uid.toString(16)}/">${allmatches[uid].steam_persona}</a> (${(sent)}/${max} sent${failed > 0 ? `, ${failed} failed` : ``})`);
        }
    }

    logHTML(`Done!`);
    changeAutomatedOfferStatus(4);
    hideSpinner(`automatedoffers`);
}

function getBarterOffers(uid) {
    return new Promise(async(res, rej) => {
        const response = await request({
            "method": `GET`,
            "url": `https://barter.vg/u/${uid.toString(16)}/o/json/`
        }).catch(rej);

        let json;
        try {
            json = JSON.parse(response.responseText);
        } catch (e) {
            rej({ "error": e, "data": response.responseText });
        }

        delete json[0]; // metadata
        res(json);
    });
}

function getBarterTradables(uid) {
    return new Promise(async(res, rej) => {
        const response = await request({
            "method": `GET`,
            "url": `https://barter.vg/u/${uid.toString(16)}/t/json/`
        }).catch(rej);

        let json;
        try {
            json = JSON.parse(response.responseText);
        } catch (e) {
            rej({ "error": e, "data": response.responseText });
        }

        res(json);
    });
}

function getFilteredTradables(uid) {
    return new Promise(async(res, rej) => {
        const response = await request({
            "method": `GET`,
            "url": `https://barter.vg/u/${uid.toString(16)}/t/f/${myuid}/json/`
        }).catch(rej);

        let json;
        try {
            json = JSON.parse(response.responseText);
        } catch (e) {
            rej({ "error": e, "data": response.responseText });
        }

        res(json);
    });
}

function getBarterItemInfo(itemid) {
    return new Promise(async(res, rej) => {
        const response = await request({
            "method": `GET`,
            "url": `https://barter.vg/i/${itemid}/json2/`
        }).catch(rej);

        let json;
        try {
            json = JSON.parse(response.responseText);
        } catch (e) {
            rej({ "error": e, "data": response.responseText });
        }

        res(json);
    });
}

function getBarterAppSettings(appid) {
    return new Promise(async(res, rej) => {
        const response = await request({
            "method": `GET`,
            "url": `https://barter.vg/app/${appid}/settings/`
        }).catch(rej);

        let json;
        try {
            json = JSON.parse(response.responseText);
        } catch (e) {
            rej({ "error": e, "data": response.responseText });
        }

        res(json);
    });
}

function sendBarterOffer(options) {
    return new Promise(async(res, rej) => {
        console.log(`options`, options);
        const response = await request({
            "url": `https://barter.vg/u/${myuid}/o/json/`,
            "method": `POST`,
            "headers": {
                "Content-Type": `application/x-www-form-urlencoded`
            },
            "data": $.param({
                "app_id": 2,
                "app_version": versionToInteger(GM_info.script.version),
                ...options
            })
        }).catch(rej);

        let json;
        try {
            json = JSON.parse(response.responseText);
        } catch (e) {
            rej({ "error": e, "data": response.responseText });
        }

        res(json);
    });
}

function delay(ms) {
    return new Promise((res) => setTimeout(() => res(), ms));
}

function request(options) {
    if (options.onload) {
        GM_xmlhttpRequest(options);
        return;
    }

    return new Promise((res, rej) => GM_xmlhttpRequest({
        "timeout": 180000,
        ...options,
        "onload": res,
        "onerror": rej,
        "ontimeout": rej,
        "onabort": rej
    }));
}

function passesMyPreferences(game, settings, want_items, platformid) {
    let pass = want_items.includes(game.item_id) && settings.platform.includes(platformid);

    if (pass && game.hasOwnProperty(`extra`)) { // Number of copies
        pass = pass && game.extra > 0;
    }

    if (pass && game.hasOwnProperty(`item_type`) && settings.hasOwnProperty(`DLC`) && !settings.DLC) {
        pass = pass && game.item_type.toLowerCase() !== `dlc`;
    }

    if (pass && settings.hasOwnProperty(`givenaway`) && !settings.givenaway) {
        pass = pass && (game.givenaway || 0) === 0;
    }

    if (pass && settings.hasOwnProperty(`minbundles`) && settings.hasOwnProperty(`maxbundles`)) {
        pass = pass && inRange(settings.minbundles, settings.maxbundles, game.bundles_all || 0);
    }

    if (pass && settings.hasOwnProperty(`mincards`) && settings.hasOwnProperty(`maxcards`)) {
        pass = pass && inRange(settings.mincards, settings.maxcards, game.cards || 0);
    }

    if (pass && settings.hasOwnProperty(`minachievements`) && settings.hasOwnProperty(`maxachievements`)) {
        pass = pass && inRange(settings.minachievements, settings.maxachievements, game.achievements || 0);
    }

    if (pass && settings.hasOwnProperty(`minreviews`) && settings.hasOwnProperty(`maxreviews`)) {
        pass = pass && inRange(settings.minreviews, settings.maxreviews, game.reviews_total || 0);
    }

    if (pass && settings.hasOwnProperty(`minscores`) && settings.hasOwnProperty(`maxscores`)) {
        pass = pass && inRange(settings.minscores, settings.maxscores, game.reviews_positive || 0);
    }

    if (pass && settings.hasOwnProperty(`minprice`) && settings.hasOwnProperty(`maxprice`)) {
        pass = pass && inRange(settings.minprice, settings.maxprice, (settings.price || 0) * 100);
    }

    if (pass && settings.hasOwnProperty(`minwishlist`) && settings.hasOwnProperty(`maxwishlist`)) {
        pass = pass && inRange(settings.minwishlist, settings.maxwishlist, settings.wishlist || 0);
    }

    if (pass && settings.hasOwnProperty(`minlibrary`) && settings.hasOwnProperty(`maxlibrary`)) {
        pass = pass && inRange(settings.minlibrary, settings.maxlibrary, settings.library || 0);
    }

    if (pass && settings.hasOwnProperty(`mintradables`) && settings.hasOwnProperty(`maxtradables`)) {
        pass = pass && inRange(settings.mintradables, settings.maxtradables, settings.tradable || 0);
    }

    return pass;
}

function passesTheirPreferences(game, user, optins, group, offeringcount, expiredays) {
    let pass = true;

    if (pass && user.hasOwnProperty(`steam_id64_string`) && optins.hasOwnProperty(user.steam_id64_string)) {
        pass = pass && optins[user.steam_id64_string];
    }

    if (pass && user.hasOwnProperty(`wants_unowned`)) {
        if (user.wants_unowned === 0) {
            pass = pass && group === `wishlist`;
        } else if (user.wants_unowned === 1) {
            pass = pass && (group === `wishlist` || group === `unowned`);
        }
    }

    if (pass && user.hasOwnProperty(`wants_library`)) {
        if (user.wants_library === 0) {
            pass = pass && group !== `library`;
        }
    }

    if (pass && user.hasOwnProperty(`wants_tradable`)) {
        if (user.wants_tradable === 0) {
            pass = pass && group !== `tradable`;
        }
    }

    if (pass && user.hasOwnProperty(`wants_cards`) && user.wants_cards === 1) {
        pass = pass && (game.cards || 0) > 0 && (game.cards_marketable || 0) === 1;
    }

    if (pass && user.hasOwnProperty(`wants_achievements`) && user.wants_achievements === 1) {
        pass = pass && (game.achievements || 0) > 0;
    }

    if (pass && user.hasOwnProperty(`avoid_givenaway`) && user.avoid_givenaway === 1) {
        pass = pass && (game.giveaway_count || 0) === 0;
    }

    if (pass && user.hasOwnProperty(`avoid_bundles`) && user.avoid_bundles === 1) {
        pass = pass && (game.bundles_available || 0) === 0;
    }

    if (pass && game.hasOwnProperty(`user_reviews_positive`) && user.hasOwnProperty(`wants_rating`) && game.user_reviews_positive >= 0) {
        pass = pass && user.wants_rating <= game.user_reviews_positive;
    }

    if (pass && user.hasOwnProperty(`max_items_per_offer`)) {
        pass = pass && user.max_items_per_offer >= offeringcount;
    }

    if (pass && game.hasOwnProperty(`source_id`) && user.hasOwnProperty(`wants_steam_only`) && user.wants_steam_only === 1) {
        pass = pass && (game.source_id === 1 || game.source_id === 2);
    }

    if (pass && game.hasOwnProperty(`item_type`) && user.hasOwnProperty(`avoid_dlc`) && user.avoid_dlc === 1) {
        pass = pass && game.item_type.toLowerCase() !== `dlc`;
    }

    if (user.hasOwnProperty(`windows`) && user.windows === 1 && user.hasOwnProperty(`mac`) && user.mac === 1 && user.hasOwnProperty(`linux`) && user.linux === 1) { // workaround
        user.windows = 0;
        user.mac = 0;
        user.linux = 0;
    }

    if (pass && game.hasOwnProperty(`windows`) && user.hasOwnProperty(`windows`) && user.windows === 1) {
        pass = pass && game.windows === 1;
    }

    if (pass && game.hasOwnProperty(`mac`) && user.hasOwnProperty(`mac`) && user.mac === 1) {
        pass = pass && game.mac === 1;
    }

    if (pass && game.hasOwnProperty(`linux`) && user.hasOwnProperty(`linux`) && user.linux === 1) {
        pass = pass && game.linux === 1;
    }

    if (pass && user.hasOwnProperty(`expire_min_from`)) {
        pass = pass && expiredays >= user.expire_min_from;
    }

    console.log(user.user_id, pass);
    return pass;
}

function fixObjectTypes(obj) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const val = obj[key];
            if (val === `true`) {
                obj[key] = true;
            } else if (val === `false`) {
                obj[key] = false;
            } else if (val === ``) {
                delete obj[key];
            } else if (isFinite(val)) {
                obj[key] = Number(val);
            }
        }
    }
    return obj;
}

function searchOffers(event) {
    const val = event.target.value.toLowerCase();
    $(`#offers tr:has(abbr)`).get().forEach((elem) => {
        if ($(elem).text().toLowerCase().includes(val)) {
            $(elem).show();
        } else {
            $(elem).hide();
        }
    });

    $(`#offers tr.commentPreview`).get().forEach((elem) => {
        if ($(elem).prev().is(`:hidden`)) {
            $(elem).hide();
        } else {
            $(elem).show();
        }
    });
}

function messageOffers(event) {
    event.preventDefault();

    const message = prompt(`Message:`);

    if (!message) {
        return;
    }

    $(`#offers tr:visible:has(abbr)`).get().forEach((elem) => $.post($(`a.textColor`, elem).attr(`href`), {
        "offer_message": message,
        "offer_setup": 3
    }, () => $(elem).find(`*`).css(`color`, `green`)));
}

function cancelOffers(event) {
    event.preventDefault();

    if (!confirm(`Are you sure you want to cancel all trade offers displayed below?`)) {
        return;
    }

    $(`#offers tr:visible:has(abbr)`).get().forEach((elem) => $.post($(`a.textColor`, elem).attr(`href`), {
        "offer_setup": 3,
        "cancel_offer": `☒ Cancel Offer`
    }, () => $(elem).remove()));
}

function extendExpiry(event) {
    event.preventDefault();
    const expire_days = parseInt(prompt(`Expiration:`, `15`));
    if (isNaN(expire_days)) {
        return;
    }

    $(`#offers tr:visible`).get().forEach((elem) => {
        const url = $(`a.textColor`, elem).attr(`href`);
        $.post(url, {
            "offer_setup": 3,
            "edit_offer": `✐ Edit Offer`
        }, (data) => {
            data = data.replace(/src="[^"]*"/ig, ``);
            const formdata = $(`#offer`, data).serializeObject();
            formdata.expire_days = expire_days;
            formdata.propose_offer = `Finish and Propose Offer`;
            $.post(url, formdata, () => $(elem).find(`*`).css(`color`, `green`));
        });
    });
}

function ajaxify() {
    $(`form:not([target='_blank'], [onsubmit])`).submit(formSubmitted);
    $(`button[name], [type=submit]:not([target='_blank'], [onsubmit])`).click(submitClicked);
}

function submitClicked(event) {
    if ($(event.target).parents(`form`).length > 0) {
        $(`[type=submit]`, $(event.target).parents(`form`)).removeAttr(`clicked`);
        $(event.target).attr(`clicked`, `true`);
    } else {
        $(`form`).off(`submit`, formSubmitted);
    }
}

function formSubmitted(event) {
    event.preventDefault();

    const form = event.target;
    const submit = $(`[clicked=true]`, form);
    const action = submit.is(`[formaction]`) ? submit.attr(`formaction`) : $(form).attr(`action`);
    const method = $(form).attr(`method`) || `POST`;
    const data = $(form).serializeObject();
    const xhr = new XMLHttpRequest();

    if (submit.attr(`name`)) {
        data[submit.attr(`name`)] = submit.attr(`value`) || ``;
    }
    submit.css(`cursor`, `not-allowed`).prop(`disabled`, true);

    $.ajax({
        "url": action,
        "method": method,
        "data": data,
        "xhr": () => xhr,
        "success": parseHtml
    });
}

function parseHtml(html, status, xhr) {
    document.documentElement.innerHTML = html;
    if (xhr) {
        History.replaceState(null, document.title, xhr.url);
    }

    barterReady();
}

function serializeObject() {
    const o = {};
    const a = this.serializeArray();
    a.forEach((elem) => {
        if (o[elem.name] !== undefined) {
            if (!o[elem.name].push) {
                o[elem.name] = [o[elem.name]];
            }
            o[elem.name].push(elem.value || ``);
        } else {
            o[elem.name] = elem.value || ``;
        }
    });
    return o;
}

function shuffle(array) {
    let currentIndex = array.length,
        temporaryValue, randomIndex;
    while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
    return array;
}

function inRange(num1, num2, numTest) {
    const [min, max] = [num1, num2].sort((a, b) => a > b);
    return numTest >= min && numTest <= max;
}

function versionToInteger(ver) {
    let i = 0;
    ver.split(`.`).reverse().forEach((n, index) => {
        i += parseInt(n) * Math.pow(10, 2 * index);
    });
    return i;
}

const stylesheet = `
    .spinner {
        -moz-animation: rotation .6s infinite linear;
        -o-animation: rotation .6s infinite linear;
        -webkit-animation: rotation .6s infinite linear;
        animation: rotation .6s infinite linear;
        border-bottom: 14px solid rgba(0, 104, 209, .15);
        border-left: 14px solid rgba(0, 104, 209, .15);
        border-radius: 100%;
        border-right: 14px solid rgba(0, 104, 209, .15);
        border-top: 14px solid rgba(0, 104, 209, .8);
        height: 70px;
        left: -moz-calc(50% - 35px);
        left: -o-calc(50% - 35px);
        left: -webkit-calc(50% - 35px);
        left: calc(50% - 35px);
        margin: 0px auto;
        position: fixed;
        top: -moz-calc(50% - 35px);
        top: -o-calc(50% - 35px);
        top: -webkit-calc(50% - 35px);
        top: calc(50% - 35px);
        width: 70px;
    }

    @-webkit-keyframes rotation {
        from { -webkit-transform: rotate(0deg); } to { -webkit-transform: rotate(359deg); }
    }

    @-moz-keyframes rotation {
        from { -moz-transform: rotate(0deg); } to { -moz-transform: rotate(359deg); }
    }

    @-o-keyframes rotation {
        from { -o-transform: rotate(0deg); } to { -o-transform: rotate(359deg); }
    }

    @keyframes rotation {
        from { transform: rotate(0deg); } to { transform: rotate(359deg); }
    }

    .strep {
        color: #777;
        margin-left: 5px;
        font-size: 90%;
    }

    .strep .plus {
        color: #090;
    }

    .strep .minus {
        color: #777;
    }

    .strep .minus.hasMinus {
        color: #d00;
        font-weight: bold;
    }

    #offerHeader {
        width: 115%;
    }

    .autocomplete {
        background: rgba(0, 0, 0, 0.6);
        display: none;
        left: 50%;
        margin-left: -20%;
        position: absolute;
        width: 45%;
    }

    .offerSlider .noUi-handle:after,
    .offerSlider .noUi-handle:before {
        display: none;
    }

    .offerSlider .noUi-tooltip {
        display: none;
        border: none;
        border-radius: unset;
        background: none;
        color: inherit;
        padding: unset;
        margin-bottom: -6px;
    }

    .offerSlider:hover .noUi-tooltip {
        display: block;
    }

    .offerSlider .noUi-connect {
        background-color: #fff;
    }

    .offerSlider .noUi-handle {
        border: 1px solid rgb(153, 17, 187);
        box-shadow: none;
        height: 20px;
        outline: none;
        width: 20px;
    }

    .offerSlider.noUi-target {
        background-color: rgba(153, 17, 187, 0.1);
        border: 1px solid rgb(153, 17, 187);
        box-shadow: none;
        float: right;
        height: 10px;
        margin: 7px;
        width: 70%;
    }

    .offerSlider.on {
        background-color: #fff;
    }
`;

init();
// ==/Code==