// ==UserScript==
// @name         Enhanced Barter
// @icon         https://bartervg.com/imgs/ico/barter/favicon-32x32.png
// @namespace    Revadike
// @author       Revadike
// @version      1.0.0
// @description  This userscript aims to enhance your experience at barter.vg
// @match        https://barter.vg/*
// @match        https://wwww.barter.vg/*
// @connect      revadike.ga
// @connect      steamcommunity.com
// @connect      steamtrades.com
// @connect      store.steampowered.com
// @grant        GM_addStyle
// @grant        GM_info
// @grant        GM_setClipboard
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-start
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/fuse.js/3.4.4/fuse.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/history.js/1.8/bundled-uncompressed/html4+html5/jquery.history.js
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
            <input id="togglebtn" onsubmit="void(0)" value="Hide/Show" type="submit" class="addTo offer bold pborder">
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
    $(`[name=remove_offer_items]`).val(`－ Remove Selected`).css(`width`, `23.8%`).css(`margin-left`, `-4px`).removeClass(`extraLeft`).after(`<input type="submit" value="◧ Invert Selection" style="width: 23.8%; margin-left: 0.5%" id="checkall" class="addTo pborder" onsubmit="void(0)"><input type="submit" value="&#128275;&#xFE0E; Enable Locked" style="width: 23.8%; margin-left: 0.5%" id="enableall" class="addTo pborder" onsubmit="void(0)">`);
    $(`[name=add_to_offer]`).val(`+ Add Selected`).css(`width`, `23.8%`).css(`margin-right`, `0.5%`);

    $(`#checkall`).click(checkAllTradables);
    $(`#enableall`).click(enableAllTradables);

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
        $(`[name="sync_list"]`).after(`<input type="submit" title="Sync ALL owned games and DLC" value="↻ Comprehensive Sync with Steam" style="margin-left: 0.5%" id="libsync" class="addTo gborder" onsubmit="void(0)">`);
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
                <input type="submit" value="Save" id="savegroup" class="addTo dborder">
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
        $(`input.offer`).after(`<input id="automatedoffer" onsubmit="void(0)" value="Begin Automated Offer" class="addTo offer bold pborder" type="submit" style="float: right;">`);
        $(`#automatedoffer`).parents(`form`).css(`width`, `100%`);
        $(`#automatedoffer`).click(setupAutomatedOffer);
        $(`.showMoreArea`).last().after(`<p>
            <label for="offersearch">
                <strong>Filter: </strong>
            </label>
            <input class="addTo pborder" id="offersearch" type="text" placeholder="Search in displayed offers..." style="width: 210px;">
            <input class="addTo pborder" style="float: right; margin-left: 4px;" id="canceloffers" type="submit" onsubmit="void(0)" value="Cancel Offers">
            <input class="addTo pborder" style="float: right; margin-left: 4px;" id="messageoffers" type="submit" onsubmit="void(0)" value="Message Offers">
            <input class="addTo pborder" style="float: right; margin-left: 4px;" id="extendoffers" type="submit" onsubmit="void(0)" value="Change Expiration">
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
        elem.name = `add_to_offer_${$(`.enable:first`).is(event.target) ? `1` : `2`}[]`;
        elem.id = $(elem).find(`+`).attr(`for`);
        elem.value = `${$(elem).parent().find(`a`).attr(`href`).split(`/`)[4]},${$(elem).find(`+`).attr(`for`).replace(`edit`, ``)}`;
    });

    $(`#enableall`).remove();
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
        // $(`#main`).replaceWith($(`#main`, data));
        parseHtml(data);
        $(`#main h2`).html(`&#x1F916;&#xFE0E;✉ Automated Offers`);
        $(`#offerHeaderTo`).html(`To <strong>Qualified Users</strong> (select options below)`);
        $(`#offerHeaderTo`).parent().next().remove();
        $(`#offer`).replaceWith(`<form id=offer>${$(`#offer`).html()}</form>`);
        $(`[name=cancel_offer]`).replaceWith(`<input class="addTo failed" value="🗑 Cancel and Discard Offer" type="submit" onclick="location.reload()">`);
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
        <div style="margin: 2em 0; border-top: 1px solid rgb(153, 17, 187); border-bottom: 1px solid rgb(153, 17, 187);" class="offerDivide"><strong class="midsized">⇅</strong> ...in exchange for...</div>
        <p>... <input min="1" id="to_ratio" name="to_ratio" type="number" value="1" style="width: 40px;"> of their tradables meeting these requirements...</p>
        <fieldset>
            <select name="limit" style="width: 24%;">
                <option value="">[ limit offers ]</option>
                <option value="">no limit (don't care)</option>
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="500">500</option>
                <option value="1000">1000</option>
                <option value="2000">2000</option>
                <option value="5000">5000</option>
                <option value="10000">10000</option>
            </select>
            <select name="bundled" style="width:24%;">
                <option value="">[ bundle count ]</option>
                <option value="">may have been bundled (don't care)</option>
                <option value="0">unbundled (0 bundles)</option>
                <option value="1024">bundled (1 or more bundles)</option>
                <option value="1">1 or fewer bundles</option>
                <option value="2">2 or fewer bundles</option>
                <option value="3">3 or fewer bundles</option>
                <option value="4">4 or fewer bundles</option>
                <option value="5">5 or fewer bundles</option>
                <option value="6">6 or fewer bundles</option>
                <option value="7">7 or fewer bundles</option>
                <option value="8">8 or fewer bundles</option>
                <option value="9">9 or fewer bundles</option>
                <option value="10">10 or fewer bundles</option>
            </select>
            <select name="givenaway" style="width:24%;">
                <option value="">[ giveaway count ]</option>
                <option value="">may be given away (don't care)</option>
                <option value="true">only given away</option>
                <option value="false">no given away</option>
            </select>
            <select name="dlc" style="width:24%;">
                <option value="">[ dlc ]</option>
                <option value="">may include DLC (don't care)</option>
                <option value="false">no DLC</option>
                <option value="true">only DLC</option>
            </select>
        </fieldset>
        <fieldset>
            <select name="reviews" title="browse by Steam user reviews % positive" style="width:19.2%;">
                <option value="">[ review % ]</option>
                <option value="">any review score (don't care)</option>
                <option value="99">99% or better</option>
                <option value="98">98% or better</option>
                <option value="97">97% or better</option>
                <option value="96">96% or better</option>
                <option value="95">95% or better</option>
                <option value="94">94% or better</option>
                <option value="93">93% or better</option>
                <option value="92">92% or better</option>
                <option value="91">91% or better</option>
                <option value="90">90% or better</option>
                <option value="85">85% or better</option>
                <option value="80">80% or better</option>
                <option value="75">75% or better</option>
                <option value="70">70% or better</option>
                <option value="60">60% or better</option>
                <option value="50">50% or better</option>
                <option value="40">40% or better</option>
                <option value="30">30% or better</option>
                <option value="20">20% or better</option>
                <option value="10">10% or better</option>
            </select>
            <select name="reviewcount" title="at least this many Steam user reviews" style="width:19.2%;">
                <option value="">[ reviews ]</option>
                <option value="">any number of reviews (don't care)</option>
                <option value="10">10 or more reviews</option>
                <option value="20">20 or more reviews</option>
                <option value="40">40 or more reviews</option>
                <option value="80">80 or more reviews</option>
                <option value="160">160 or more reviews</option>
                <option value="320">320 or more reviews</option>
                <option value="640">640 or more reviews</option>
                <option value="1280">1280 or more reviews</option>
                <option value="2560">2560 or more reviews</option>
                <option value="5120">5120 or more reviews</option>
                <option value="10240">10240 or more reviews</option>
                <option value="20480">20480 or more reviews</option>
                <option value="40960">40960 or more reviews</option>
                <option value="81920">81920 or more reviews</option>
                <option value="163840">163840 or more reviews</option>
            </select>
            <select name="cards" title="show only games with Steam trading cards" style="width:19.2%;">
                <option value="">[ cards ]</option>
                <option value="">may have cards (don't care)</option>
                <option value="true">only with cards</option>
                <option value="false">only without cards</option>
            </select>
            <select name="achievements" title="show games with Steam achievements" style="width:19.2%;">
                <option value="">[ achievements ]</option>
                <option value="">may have achievements (don't care)</option>
                <option value="true">only with achievements</option>
                <option value="false">only without achievements</option>
            </select>
            <select name="price" title="filter by US Steam store price" style="width:19.2%;">
                <option value="">[ price ]</option>
                <option value="">any price (don't care)</option>
                <option value="150">$150 or more</option>
                <option value="140">$140 or more</option>
                <option value="130">$130 or more</option>
                <option value="120">$120 or more</option>
                <option value="110">$110 or more</option>
                <option value="100">$100 or more</option>
                <option value="95">$95 or more</option>
                <option value="90">$90 or more</option>
                <option value="85">$85 or more</option>
                <option value="80">$80 or more</option>
                <option value="75">$75 or more</option>
                <option value="70">$70 or more</option>
                <option value="65">$65 or more</option>
                <option value="60">$60 or more</option>
                <option value="55">$55 or more</option>
                <option value="50">$50 or more</option>
                <option value="45">$45 or more</option>
                <option value="40">$40 or more</option>
                <option value="35">$35 or more</option>
                <option value="30">$30 or more</option>
                <option value="29">$29 or more</option>
                <option value="28">$28 or more</option>
                <option value="27">$27 or more</option>
                <option value="26">$26 or more</option>
                <option value="25">$25 or more</option>
                <option value="24">$24 or more</option>
                <option value="23">$23 or more</option>
                <option value="22">$22 or more</option>
                <option value="21">$21 or more</option>
                <option value="20">$20 or more</option>
                <option value="19">$19 or more</option>
                <option value="18">$18 or more</option>
                <option value="17">$17 or more</option>
                <option value="16">$16 or more</option>
                <option value="15">$15 or more</option>
                <option value="14">$14 or more</option>
                <option value="13">$13 or more</option>
                <option value="12">$12 or more</option>
                <option value="11">$11 or more</option>
                <option value="10">$10 or more</option>
                <option value="9">$9 or more</option>
                <option value="8">$8 or more</option>
                <option value="7">$7 or more</option>
                <option value="6">$6 or more</option>
                <option value="5">$5 or more</option>
                <option value="4">$4 or more</option>
                <option value="3">$3 or more</option>
                <option value="2">$2 or more</option>
                <option value="1">$1 or more</option>
            </select>
        </fieldset>
        <fieldset>
            <select name="wishlistmax" title="filter by wishlist count" style="width: 32%;">
                <option value="">[ wishlist max count ]</option>
                <option value="">any wishlist barter users count (don't care)</option>
                <option value="700">700 or less</option>
                <option value="600">600 or less</option>
                <option value="500">500 or less</option>
                <option value="400">400 or less</option>
                <option value="300">300 or less</option>
                <option value="250">250 or less</option>
                <option value="200">200 or less</option>
                <option value="175">175 or less</option>
                <option value="150">150 or less</option>
                <option value="125">125 or less</option>
                <option value="100">100 or less</option>
                <option value="75">75 or less</option>
                <option value="50">50 or less</option>
                <option value="25">25 or less</option>
                <option value="10">10 or less</option>
                <option value="1">1 or less</option>
                <option value="0">0 (nobody wishlisted it)</option>
            </select>
            <select name="librarymax" title="filter by barter users library count" style="width: 32%;">
                <option value="">[ library max count ]</option>
                <option value="">any library count (don't care)</option>
                <option value="700">700 or less</option>
                <option value="600">600 or less</option>
                <option value="500">500 or less</option>
                <option value="400">400 or less</option>
                <option value="300">300 or less</option>
                <option value="250">250 or less</option>
                <option value="200">200 or less</option>
                <option value="175">175 or less</option>
                <option value="150">150 or less</option>
                <option value="125">125 or less</option>
                <option value="100">100 or less</option>
                <option value="75">75 or less</option>
                <option value="50">50 or less</option>
                <option value="25">25 or less</option>
                <option value="10">10 or less</option>
                <option value="1">1 or less</option>
                <option value="0">0 (nobody owns it)</option>
            </select>
            <select name="tradablemax" title="filter by barter users tradable count" style="width: 32%;">
                <option value="">[ tradable max count ]</option>
                <option value="">any tradable count (don't care)</option>
                <option value="700">700 or less</option>
                <option value="600">600 or less</option>
                <option value="500">500 or less</option>
                <option value="400">400 or less</option>
                <option value="300">300 or less</option>
                <option value="250">250 or less</option>
                <option value="200">200 or less</option>
                <option value="175">175 or less</option>
                <option value="150">150 or less</option>
                <option value="125">125 or less</option>
                <option value="100">100 or less</option>
                <option value="75">75 or less</option>
                <option value="50">50 or less</option>
                <option value="25">25 or less</option>
                <option value="10">10 or less</option>
                <option value="1">1 or less</option>
                <option value="0">0 (nobody has it for trade)</option>
            </select>
        </fieldset>
        <fieldset>
            <select name="wishlistmin" title="filter by wishlist count" style="width: 32%;">
                <option value="">[ wishlist min count ]</option>
                <option value="">any wishlist count (don't care)</option>
                <option value="700">700 or more</option>
                <option value="600">600 or more</option>
                <option value="500">500 or more</option>
                <option value="400">400 or more</option>
                <option value="300">300 or more</option>
                <option value="250">250 or more</option>
                <option value="200">200 or more</option>
                <option value="175">175 or more</option>
                <option value="150">150 or more</option>
                <option value="125">125 or more</option>
                <option value="100">100 or more</option>
                <option value="75">75 or more</option>
                <option value="50">50 or more</option>
                <option value="25">25 or more</option>
                <option value="10">10 or more</option>
                <option value="1">1 or more</option>
            </select>
            <select name="librarymin" title="filter by barter users library count" style="width: 32%;">
                <option value="">[ library min count ]</option>
                <option value="">any library count (don't care)</option>
                <option value="700">700 or more</option>
                <option value="600">600 or more</option>
                <option value="500">500 or more</option>
                <option value="400">400 or more</option>
                <option value="300">300 or more</option>
                <option value="250">250 or more</option>
                <option value="200">200 or more</option>
                <option value="175">175 or more</option>
                <option value="150">150 or more</option>
                <option value="125">125 or more</option>
                <option value="100">100 or more</option>
                <option value="75">75 or more</option>
                <option value="50">50 or more</option>
                <option value="25">25 or more</option>
                <option value="10">10 or more</option>
                <option value="1">1 or more</option>
            </select>
            <select name="tradablemin" title="filter by barter users tradable count" style="width: 32%;">
                <option value="">[ tradable min count ]</option>
                <option value="">any tradable count (don't care)</option>
                <option value="700">700 or more</option>
                <option value="600">600 or more</option>
                <option value="500">500 or more</option>
                <option value="400">400 or more</option>
                <option value="300">300 or more</option>
                <option value="250">250 or more</option>
                <option value="200">200 or more</option>
                <option value="175">175 or more</option>
                <option value="150">150 or more</option>
                <option value="125">125 or more</option>
                <option value="100">100 or more</option>
                <option value="75">75 or more</option>
                <option value="50">50 or more</option>
                <option value="25">25 or more</option>
                <option value="10">10 or more</option>
                <option value="1">1 or more</option>
            </select>
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
        <p><button id="massSendBtn" style="font-weight: bold; color: green; width: 100%; height: 2em; font-size: 1.2em; cursor: pointer;">Finish and Send Automated Offers</button>`);
        $(`#massSendBtn`).click((event) => {
            event.preventDefault();
            sendAutomatedOffers();
            return false;
        });
        $(`[name='add_to_offer_1[]']`).attr(`name`, `offering`);
        $(`#offerStatus+ div`).remove();
        $(`#offerStatus`).attr(`style`, `border-top: 1px solid rgb(153, 17, 187); border-bottom: 1px solid rgb(153, 17, 187);`);
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

    let offers = await getBarterOffers(parseInt(myuid, 16));
    let dailylimit = calculateStupidDailyLimit(offers); // barter's stupid daily offer limit

    if (dailylimit <= 0) {
        logHTML(`<strong>Cancelled, because you hit/exceeded <a target="_blank" href="/u/a0/">barter.vg</a>'s daily offer limit...<br>Help him convince to remove this limit by complaining to him!</strong>`);
        return;
    }

    if (settings.synclib) {
        logHTML(`Syncing your <a target="_blank" href="/u/${myuid}/l/">barter library</a> with your <a target="_blank" href="https://store.steampowered.com/dynamicstore/userdata/">steam user data</a>...`);
        await syncLibrary();
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

    const max = Math.min(settings.limit || Number.MAX_SAFE_INTEGER, Object.keys(allmatches).length);
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
        "timeout": 6000,
        ...options,
        "onload": res,
        "onerror": rej,
        "ontimeout": rej,
        "onabort": rej
    }));
}

function passesMyPreferences(game, settings, want_items, platformid) {
    let pass = want_items.includes(game.item_id) && settings.platform.includes(platformid);

    if (pass && game.hasOwnProperty(`extra`)) {
        pass = pass && game.extra > 0;
    }

    if (pass && game.hasOwnProperty(`bundles_all`) && settings.hasOwnProperty(`bundled`)) {
        pass = pass && game.bundles_all <= settings.bundled;
        if (settings.bundled === 1024) {
            pass = pass && game.bundles_all > 0;
        }
    }

    if (pass && game.hasOwnProperty(`givenaway`) && settings.hasOwnProperty(`givenaway`)) {
        pass = pass && game.givenaway > 0 === settings.givenaway;
    }

    if (pass && game.hasOwnProperty(`item_type`) && settings.hasOwnProperty(`dlc`)) {
        pass = pass && game.item_type.toLowerCase() === `dlc` === settings.dlc;
    }

    if (pass && game.hasOwnProperty(`reviews_positive`) && settings.hasOwnProperty(`reviews`)) {
        pass = pass && game.reviews_positive >= settings.reviews;
    }

    if (pass && game.hasOwnProperty(`reviews_total`) && settings.hasOwnProperty(`reviewcount`)) {
        pass = pass && game.reviews_total >= settings.reviewcount;
    }

    if (pass && game.hasOwnProperty(`cards`) && settings.hasOwnProperty(`cards`)) {
        pass = pass && game.cards > 0 === settings.cards;
    }

    if (pass && game.hasOwnProperty(`achievements`) && settings.hasOwnProperty(`achievements`)) {
        pass = pass && game.achievements > 0 === settings.achievements;
    }

    if (pass && game.hasOwnProperty(`price`) && settings.hasOwnProperty(`price`)) {
        pass = pass && game.price >= settings.price * 100;
    }

    if (pass && game.hasOwnProperty(`wishlist`) && settings.hasOwnProperty(`wishlistmax`)) {
        pass = pass && game.wishlist < parseInt(settings.wishlistmin);
    }

    if (pass && game.hasOwnProperty(`tradable`) && settings.hasOwnProperty(`tradablemax`)) {
        pass = pass && game.tradable < parseInt(settings.tradablemax);
    }

    if (pass && game.hasOwnProperty(`library`) && settings.hasOwnProperty(`librarymax`)) {
        pass = pass && game.library < parseInt(settings.librarymax);
    }

    if (pass && game.hasOwnProperty(`wishlist`) && settings.hasOwnProperty(`wishlistmin`)) {
        pass = pass && game.wishlist >= parseInt(settings.wishlistmin);
    }

    if (pass && game.hasOwnProperty(`tradable`) && settings.hasOwnProperty(`tradablemin`)) {
        pass = pass && game.tradable >= parseInt(settings.tradablemin);
    }

    if (pass && game.hasOwnProperty(`library`) && settings.hasOwnProperty(`librarymin`)) {
        pass = pass && game.library >= parseInt(settings.librarymin);
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

    if (pass && game.hasOwnProperty(`cards`) && user.hasOwnProperty(`wants_cards`) && user.wants_cards === 1) {
        pass = pass && game.cards > 0;
        if (pass && game.hasOwnProperty(`cards_marketable`)) {
            pass = pass && game.cards_marketable === 1;
        }
    }

    if (pass && game.hasOwnProperty(`achievements`) && user.hasOwnProperty(`wants_achievements`) && user.wants_achievements === 1) {
        pass = pass && game.achievements > 0;
    }

    if (pass && game.hasOwnProperty(`giveaway_count`) && user.hasOwnProperty(`avoid_givenaway`) && user.avoid_givenaway === 1) {
        pass = pass && game.giveaway_count === 0;
    }

    if (pass && game.hasOwnProperty(`bundles_available`) && user.hasOwnProperty(`avoid_bundles`) && user.avoid_bundles === 1) {
        pass = pass && game.bundles_available === 0;
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
    $(`#offers tr:not(:first)`).get().forEach((elem) => {
        if ($(elem).text().toLowerCase().includes(val)) {
            $(elem).show();
        } else {
            $(elem).hide();
        }
    });
}

function messageOffers(event) {
    event.preventDefault();

    const message = prompt(`Message:`);

    if (!message) {
        return;
    }

    $(`#offers tr:visible`).get().forEach((elem) => $.post($(`a.textColor`, elem).attr(`href`), {
        "offer_message": message,
        "offer_setup": 3
    }, () => $(elem).css(`color`, `green`).find(`.textColor`).css(`color`, `green`)));
}

function cancelOffers(event) {
    event.preventDefault();

    if (!confirm(`Are you sure you want to cancel all trade offers displayed below?`)) {
        return;
    }

    $(`#offers tr:visible`).get().forEach((elem) => $.post($(`a.textColor`, elem).attr(`href`), {
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
            $.post(url, formdata, () => $(elem).css(`color`, `green`).find(`.textColor`).css(`color`, `green`));
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
`;

init();
// ==/Code==