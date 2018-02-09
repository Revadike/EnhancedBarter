// ==UserScript==
// @name         Enhanced Barter
// @icon         https://bartervg.com/imgs/ico/barter/favicon-32x32.png
// @namespace    Royalgamer06
// @author       Royalgamer06
// @version      0.9.15.0
// @description  This userscript aims to enhance your experience at barter.vg
// @include      https://barter.vg/*
// @include      https://www.steamtrades.com/user/*?do=postcomments&message=*
// @connect      steamcommunity.com
// @connect      store.steampowered.com
// @connect      steamtrades.com
// @connect      royalgamer06.ga
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_info
// @grant        GM_addStyle
// @grant        unsafeWindow
// @run-at       document-start
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js
// @homepageURL  https://github.com/Royalgamer06/EnhancedBarter/
// @supportURL   https://github.com/Royalgamer06/EnhancedBarter/issues
// @downloadURL  https://github.com/Royalgamer06/EnhancedBarter/raw/master/Enhanced%20Barter.user.js
// @updateURL    https://github.com/Royalgamer06/EnhancedBarter/raw/master/Enhanced%20Barter.user.js
// ==/UserScript==

// ==Code==
this.$ = this.jQuery = jQuery.noConflict(true);
var requests = [],
    requestRateLimit = 300,
    myuid = null,
    mysid = null;

function init() {
    if (location.host === "barter.vg") {
        setTimeout(initBarter, 0);
    } else if (location.host === "www.steamtrades.com" && getURIParam("do") == "postcomments") {
        setTimeout(initSteamTrades, 0);
    }
}

function initBarter() {
    unsafeWindow.cancelOffers = cancelOffers;
    unsafeWindow.remindPendingOffers = remindPendingOffers;
    unsafeWindow.remindCompletedOffers = remindCompletedOffers;
    unsafeWindow.fixIgnored = fixIgnored;
    unsafeWindow.showIgnored = showIgnored;
    unsafeWindow.findIgnored = findIgnored;
    unsafeWindow.findAllIgnored = findAllIgnored;
    unsafeWindow.syncLibrary = syncLibrary;
    unsafeWindow.extendExpiry = extendExpiry;
    unsafeWindow.massSendOffers = massSendOffers;
    unsafeWindow.massSendMutualOffers = massSendMutualOffers;
    unsafeWindow.removeOwnedGamesFromPending = removeOwnedGamesFromPending;

    GM_addStyle(`.spinner {
        position: fixed;
        left: -webkit-calc(50% - 35px);
        left: -moz-calc(50% - 35px);
        left: -o-calc(50% - 35px);
        left: calc(50% - 35px);
        top: -webkit-calc(50% - 35px);
        top: -moz-calc(50% - 35px);
        top: -o-calc(50% - 35px);
        top: calc(50% - 35px);
        height: 70px;
        width: 70px;
        margin: 0px auto;
        -webkit-animation: rotation .6s infinite linear;
        -moz-animation: rotation .6s infinite linear;
        -o-animation: rotation .6s infinite linear;
        animation: rotation .6s infinite linear;
        border-left: 14px solid rgba(0, 104, 209, .15);
        border-right: 14px solid rgba(0, 104, 209, .15);
        border-bottom: 14px solid rgba(0, 104, 209, .15);
        border-top: 14px solid rgba(0, 104, 209, .8);
        border-radius: 100%;
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
    }`);

    setInterval(handleRequests, requestRateLimit);
    $.ajaxSetup({
        beforeSend: function(xhr, options) {
            $("body").prepend('<div class="spinner"></div>');
            var request = function() {
                options.beforeSend = function() {
                    return true;
                };
                $.ajax(options);
            };
            requests.push(request);
            return false;
        },
        complete: $(".spinner").remove
    });

    $.fn.serializeObject = serializeObject;
    $.fn.zip = zip;

    $(document).ready(barterReady);
}

function barterReady() {
    setTimeout(ajaxify, 0);
    myuid = $("#signin").attr("href").split("/")[4];
    mysid = $("abbr+ a:has(.icon)").length > 0 ? $("abbr+ a:has(.icon)").attr("href").split("/")[4] : 0;
    if (location.pathname.includes("/u/")) {
        if (location.pathname.includes("/o/")) {
            if (location.pathname.includes(myuid) && $("input[value='Completed Offer']").length > 0) {
                $("input[value='Completed Offer']").click(function(event) {
                    event.preventDefault();
                    var steamid = $("a[href*='/steamcommunity.com/profiles/']:not([href*=" + mysid + "])").attr("href").split("/")[4];
                    var name = $("th:contains('Next Step')+ > a[href*='/steamcommunity.com/profiles/']").text().replace(" on Steam", "");
                    var msg = "＋REP " + name + " is an amazing trader, recommended! We successfully completed this trade: " + location.href + ". Thanks a lot for the trade!";
                    leaveFeedback(this, msg, steamid);
                });
            } else if (location.pathname.includes(myuid) && $(".activity").length > 0) {
                $(".activity").first().before(`<br>
                        <strong>Or...  </strong>
                        <input id="automatedoffer" type="submit" value="Begin Automated Offer"></input>
                        <input id="removeowned" type="submit" value="Remove Owned Games From Pending Offers" style="float:right;"></input>`);
                $("#automatedoffer").click(setupAutomatedOffer);
                $("#removeowned").click(confirmRemoveOwned);
                $(".showMoreArea").after(`<p>
                        <label for="offersearch">
                            <strong>Filter: </strong>
                        </label>
                        <input id="offersearch" type="text" placeholder="Search in displayed offers..." style="width: 260px;">
                        <input id="canceloffers" type="submit" value="Cancel Offers">
                        <input id="messageoffers" type="submit" value="Message Offers">
                        <input id="extendoffers" type="submit" value="Extend Expiration">
                    </p>`);
                $("#offersearch").on("change keyup paste", function() {
                    var val = $(this).val();
                    $("#offers tr").each(function() {
                        if ($(this).text().includes(val)) {
                            $(this).show();
                        } else {
                            $(this).hide();
                        }
                    });
                });
                $("#canceloffers").click(cancelOffers);
                $("#messageoffers").click(messageOffers);
                $("#extendoffers").click(extendExpiry);
            }
            [3, 7].forEach(function(i) {
                $("#exchanges > fieldset:nth-child(" + i + ")").append('<input type="submit" value="Invert all checkboxes" style="width:100%;height:2em;margin-bottom:.7em;" id="checkall' + i + '">');
                $("#checkall" + i).on("click", function() {
                    $("#exchanges > fieldset:nth-child(" + i + ") input[type=checkbox]").each(function() {
                        this.checked = !this.checked;
                    });
                    return false;
                });
                $("#exchanges > fieldset:nth-child(" + i + ")").append('<input type="submit" value="Enable disabled tradables" style="width:100%;height:2em;margin-bottom:.7em;" id="enable' + i + '">');
                $("#enable" + i).on("click", function(event) {
                    event.preventDefault();
                    if (confirm("Are you sure you want to enable disabled tradables? Make sure the other party is okay with this!")) {
                        setTimeout(function() {
                            $("#exchanges > fieldset:nth-child(" + i + ") input[disabled]").each(function() {
                                this.removeAttribute("disabled");
                                this.removeAttribute("title");
                                this.name = "add_to_offer_" + (i > 3 ? "2" : "1") + "[]";
                                this.id = $(this).find("+").attr("for");
                                this.value = $(this).parent().find("a").attr("href").split("/")[4] + "," + $(this).find("+").attr("for").replace("edit", "");
                            });
                        }, 0);
                    }
                    $("#enable").hide();
                });
            });
        }
    }
}

function initSteamTrades() {
    var steamid = getURIParam("steamid");
    var msg = applySentenceCase(getURIParam("message").replace(/\+/g, ' '));
    var profile_id = $("[name=profile_id]").val();
    var xsrf_token = $("[name=xsrf_token]").val();
    if (profile_id !== undefined) {
        var data = {
            do: "review_insert",
            xsrf_token: xsrf_token,
            profile_id: profile_id,
            rating: 1,
            description: msg
        };
        $.ajax({
            url: "https://www.steamtrades.com/ajax.php",
            method: "POST",
            data: data,
            success: function() {
                unsafeWindow.close();
            }
        });
    } else {
        console.log("Already left feedback previously");
        unsafeWindow.close();
    }
}

function handleRequests() {
    if (requests.length > 0) {
        if (requests.length === 1) {
            setTimeout(function() {
                console.log("All ajax requests are served!");
            }, requestRateLimit);
        }
        console.log(requests.length + " Ajax requests remaining...\nThis will roughly take " + (requests.length * requestRateLimit / 1000) + " seconds to complete.");
        var request = requests.shift();
        if (typeof request === "function") {
            request();
        }
    }
}

function syncLibrary(callback) {
    $.post("/u/" + myuid + "/l/", {
        sync_list: "↻ Sync List",
        type: 1
    });
    var v = parseInt(GM_getValue("dsudv", 1));
    v++;
    GM_setValue("dsudv", v);
    GM_xmlhttpRequest({
        method: "GET",
        url: "http://store.steampowered.com/dynamicstore/userdata/?v=" + v,
        onload: function(response) {
            var json = JSON.parse(response.responseText);
            var ownedApps = json.rgOwnedApps;
            $.post("/u/" + myuid + "/l/e/", {
                bulk_AppIDs: ownedApps.join(","),
                add_AppIDs: "+ Add AppIDs",
                action: "Edit",
                change_attempted: 1,
                add_from: "AppIDs"
            }, function() {
                if (callback) callback();
            });
        }
    });
}

function fixIgnored() {
    var y = $.unique(GM_getValue("ignored").split(","));
    y.splice($.inArray(myuid, y), 1);
    GM_setValue("ignored", y.join(","));
}

function showIgnored() {
    fixIgnored();
    console.log(GM_getValue("ignored").slice(0, -1).split(","));
}

function findIgnored() {
    $.get("/u/" + myuid + "/o/", function(data) {
        console.log("fdlkdsklfkld");
        data = data.replace(/src="[^"]*"/ig, "");
        var users = [];
        $("[href*='/u/']", data).each(function() {
            let url = this.href;
            if (/^https?:\/\/barter\.vg\/u\/[a-zA-Z0-9]{1,5}\/$/.test(url) && $.inArray(url, users) == -1) {
                $.get(url, function(data) {
                    data = data.replace(/src="[^"]*"/ig, "");
                    var ignored = $.unique(GM_getValue("ignored", "").split(","));
                    if ($("form[action*='/o/']", data).length === 0 && $.inArray(url.split("/")[4], ignored) == -1 && url.split("/")[4] !== myuid) {
                        GM_setValue("ignored", ignored.join(",") + url.split("/")[4] + ",");
                    }
                });
            }
        });
        fixIgnored();
    });
}

function findAllIgnored() {
    $.getJSON("/u/json/", function(json) {
        for (var uid in json) {
            if (json[uid].active > -1) {
                isIgnored("/u/" + uid + "/");
            }
        }
    });
}

function isIgnored(url) {
    $.get(url, function(data) {
        data = data.replace(/src="[^"]*"/ig, "");
        var ignored = $.unique(GM_getValue("ignored", "").split(","));
        if ($("form[action*='/o/']", data).length === 0 && $.inArray(url.split("/")[4], ignored) == -1 && url.split("/")[4] !== myuid) {
            GM_setValue("ignored", ignored.join(",") + url.split("/")[4] + ",");
        }
    });
}

function remindPendingOffers() {
    var reminder = "Hey, I saw that you looked at the offer. Would you please be so kind and respond to it as well? I'd appreciate that very much! Thank you!";
    $("tr.active [title*=Opened]+:contains('pending')").each(function() {
        $.post(this.href, {
            offer_message: reminder,
            offer_setup: 3
        });
    });
}

function remindCompletedOffers() {
    var steammsg = "Hello, please mark our trade as complete on barter. I would appreciate that! Thank you!";
    var bartermsg = "Hello, please mark our trade as complete. I would appreciate that! Thank you!";
    var steamids = [];
    var ajaxDone = 0;
    $.post("/u/" + myuid + "/o/", {
        filter_by_status: "completed"
    }, function(data) {
        data = data.replace(/src="[^"]*"/ig, "");
        var count = $(".active:contains('completed'):not(.completed)", data).length;
        $($(".active:contains('completed'):not(.completed)", data).get().reverse()).each(function() {
            let url = $(this).find("td+ td a").attr("href");
            $.post(url, {
                offer_message: bartermsg,
                offer_setup: 3
            });
        });
    });
}

function leaveFeedback(elem, msg, steamid) {
    $(elem).val("Completing trade, sending feedback and syncing library...").attr("disabled", true);
    $.post($(elem).parents("form").attr("action"), $(elem).parents("form").serializeObject());
    var steamids = [steamid];
    //postSteamComment(msg, steamids);
    postSteamTradesComment(msg, steamid);
    setPostTradeClipboard();
    syncLibrary(function() {
        location.reload();
    });
}

function setPostTradeClipboard() {
    var uids = [];
    $("#offerHeader > tbody > tr > td:nth-child(2) > strong > a").each(function() {
        uids.push(this.href.split("/")[4]);
    });
    uids.splice($.inArray(myuid, uids), 1);
    var uid = uids[0];
    var tradelink = location.href.split(myuid)[0] + uid + location.href.split(myuid)[1];
    var sgprofile = "https://www.steamtrades.com/user/" + mysid;
    var msg = "Thanks for the trade!\nI completed the trade on barter.vg and left feedback on your steamtrades profile.\nIf you haven't done so already, could you please do the same?\n" + tradelink + "\n" + sgprofile;
    GM_setClipboard(msg);
}

function postSteamTradesComment(msg, steamid) {
    window.open("https://www.steamtrades.com/user/" + steamid + "?do=postcomments&message=" + msg, "_blank");
}

function setupAutomatedOffer() {
    var settings = {};
    settings.offering_titles = prompt("Offering (max ~= 6 games):", "GameTitle1, GameTitle2, ...").split(",").map(Function.prototype.call, String.prototype.trim);
    settings.offering_to_group = prompt("Make offers to group:", "wishlist, unowned").split(",").map(Function.prototype.call, String.prototype.trim); //tradable, wishlist, unowned (, library, blacklist)
    settings.max_offers = prompt("Maximum number of trade offers you want to send (no limit = all):", "all");
    settings.want_from_group = prompt("I want games/DLC from group:", "wishlist, unowned").split(",").map(Function.prototype.call, String.prototype.trim); //tradable, wishlist, unowned, library
    settings.max_want = prompt("Maximum number of games/DLC I want to ask (no limit = all):", "25");
    settings.ratio = prompt("Ratio of offering (mine) against want (yours) (all = all):", "1:1");
    settings.expire_days = parseInt(prompt("Days until offer expires (max = 15):", "15"));
    settings.trading_cards_only = confirm("Do you only want games with trading cards? (cancel = no)");
    settings.unbundled_only = confirm("Do you only want unbundled games/DLC? (cancel = no)");
    settings.exclude_givenaway = confirm("Do you want to exclude given away (free) games? (cancel = no)");
    settings.min_rating = parseInt(prompt("Minimum game/DLC rating (unrated games/DLC will be included):", "0"));
    if (settings.min_rating === null || isNaN(settings.min_rating) || !isFinite(settings.min_rating)) {
        settings.min_rating = false;
    }
    settings.exclude_title_containing = prompt("Exclude games/DLC containing the term(s):", "DLC, OST, pack, soundtrack");
    if (settings.exclude_title_containing !== null && settings.exclude_title_containing !== "") {
        settings.exclude_title_containing = settings.exclude_title_containing.split(",").map(Function.prototype.call, String.prototype.trim);
    } else {
        settings.exclude_title_containing = false;
    }
    settings.message = prompt("Message included in each offer (blank = no message):", "");
    if (confirm("Are you sure you want to send this automated offer?\nBeware that this may cause traders to add you to their ignore list!")) {
        $("#automatedoffer").prop("disabled", true).val("Sending mass offers...");
        console.log("Sending mass offers...", settings);
        alert("Initiated process of sending automated offers!\nCheck the javascript console (F12) and network tab for details.\nPlease don't close this tab until all offers have finished sending.\nThis may take a few minutes!");
        massSendOffers(settings);
    }
}

function massSendOffers(settings) {
    if (settings.offering_titles.length === 0) return alert("No argument \"offering_titles\". Example: \"The Forest\"");
    settings.offering_titles = settings.offering_titles ? new RegExp(settings.offering_titles.join("|"), "gi") : new RegExp(".^");
    $.getJSON("/u/" + myuid + "/t/json/", function(mytradables) {
        var offering = [];
        var ato1 = [];
        for (var platformid in mytradables.by_platform) {
            for (var tradeid in mytradables.by_platform[platformid]) {
                let tradable = mytradables.by_platform[platformid][tradeid];
                if (containsInTradableTitle(tradable, settings.offering_titles)) {
                    console.log("Tradable:", tradable);
                    tradable.users = [];
                    offering.push(tradable);
                    ato1.push(tradable.item_id + "," + tradable.line_id);
                }
            }
        }
        if (offering.length === 0) return alert("Could not find tradable(s)!\nPlease provide a more accurate name of your tradable and make sure this item is in your tradables list.");
        syncLibrary(function() {
            GM_xmlhttpRequest({
                method: "GET",
                url: "https://royalgamer06.ga/barter/json.php",
                onload: function(response) {
                    var optins = JSON.parse(response.responseText);
                    /*
                    TODO:
                    - Add platform exclusion support
                    - Add tag exclusion support
                    - Add tradable-wishlist-settings.ratio support
                    - Add counter preference support
                    - Add custom message support
                    - Add better UI
                    - Don't include owned games in multi-offers
                    */

                    //SETUP
                    settings.offering_to_group = settings.offering_to_group ? settings.offering_to_group : ["wishlist"]; //tradable, wishlist, unowned, library, blacklist
                    if (settings.offering_to_group.includes("unowned") && !settings.offering_to_group.includes("wishlist")) {
                        settings.offering_to_group.push("wishlist"); // All users in wishlist belong to unowned
                    }
                    settings.max_offers = settings.max_offers ? settings.max_offers : Number.MAX_SAFE_INTEGER;
                    settings.max_offers = parseInt(settings.max_offers.replace(/all/gi, Number.MAX_SAFE_INTEGER));
                    settings.want_from_group = settings.want_from_group ? settings.want_from_group.filter(function(group) {
                        return !!group.toLowerCase().match(/^(tradable|wishlist|unowned|library)$/g);
                    }) : ["wishlist"]; //tradable, wishlist, library, blacklist, unowned
                    settings.max_want = settings.max_want ? settings.max_want : Number.MAX_SAFE_INTEGER;
                    settings.max_want = parseInt(settings.max_want.replace(/all/gi, Number.MAX_SAFE_INTEGER));
                    settings.ratio = settings.ratio ? settings.ratio.toLowerCase().trim() : "all:1";
                    settings.ratio = settings.ratio.replace(/all/gi, "0").split(":");
                    settings.ratio[0] = parseInt(settings.ratio[0]);
                    settings.ratio[1] = parseInt(settings.ratio[1]);
                    settings.ratio[0] = Math.min(settings.ratio[0], offering.length);
                    settings.expire_days = settings.expire_days ? settings.expire_days : 1000;
                    settings.trading_cards_only = typeof settings.trading_cards_only !== "undefined" ? settings.trading_cards_only : false;
                    settings.unbundled_only = typeof settings.unbundled_only !== "undefined" ? settings.unbundled_only : false;
                    settings.exclude_givenaway = typeof settings.exclude_givenaway !== "undefined" ? settings.exclude_givenaway : false;
                    //exclude_combined = typeof exclude_combined !== "undefined" ? exclude_combined : false;
                    settings.min_rating = settings.min_rating ? settings.min_rating : 0;
                    settings.exclude_title_containing = settings.exclude_title_containing ? new RegExp(settings.exclude_title_containing.join("|"), "gi") : new RegExp(".^");
                    settings.message = settings.message ? settings.message : "";
                    var done = 0;
                    offering.forEach(function(o, i) {
                        let index = i;
                        $.getJSON("/i/" + o.item_id + "/json2/", function(gameinfo) {
                            //EXECUTION
                            shuffle(settings.offering_to_group).forEach(function(group) {
                                group = group.toLowerCase();
                                if (gameinfo.users[group]) {
                                    var users = shuffle(Object.keys(gameinfo.users[group]));
                                    users.forEach(function(userid) {
                                        let uid = parseInt(userid);
                                        let user = gameinfo.users[group][uid];
                                        console.log(user,
                                            (optins.hasOwnProperty(user.steam_id64_string) ? optins[user.steam_id64_string] : true),
                                            user.tradeable_count >= parseInt(settings.ratio[1]),
                                            //user.wants_rating <= o.rating ,
                                            (user.wants_unowned === 0 ? group === "wishlist" : true),
                                            (user.wants_cards === 1 ? o.cards > 0 : true),
                                            (user.avoid_givenaway === 1 ? o.givenaway === 0 : true),
                                            (user.avoid_bundles === 1 ? o.bundles_available === 0 : true));
                                        if ((optins.hasOwnProperty(user.steam_id64_string) ? optins[user.steam_id64_string] : true) &&
                                            user.tradeable_count >= parseInt(settings.ratio[1]) &&
                                            //user.wants_rating <= o.rating &&
                                            (user.wants_unowned === 0 ? group === "wishlist" : true) &&
                                            (user.wants_cards === 1 ? o.cards > 0 : true) &&
                                            (user.avoid_givenaway === 1 ? o.givenaway === 0 : true) &&
                                            (user.avoid_bundles === 1 ? o.bundles_available === 0 : true)) {
                                            offering[index].users.push(uid);
                                        }
                                    });
                                }
                            });
                            done++;
                            if (done >= offering.length) {
                                var users = [];
                                console.log(settings.ratio[0], offering.length, settings.ratio[0] === 0 || settings.ratio[0] >= offering.length);
                                if (settings.ratio[0] === 0 || settings.ratio[0] >= offering.length) {
                                    console.log("intersect");
                                    users = offering[0].users;
                                    offering.forEach(function(o, i) {
                                        if (i !== 0) users = $(users).filter(o.users).get();
                                    });
                                } else {
                                    console.log("union");
                                    offering.forEach(function(o) {
                                        console.log(users, o.users);
                                        users = users.concat(o.users);
                                    });
                                }
                                users = [...new Set(users)]; //unique
                                console.log(users);
                                var trade_count = 0;
                                shuffle(users).forEach(function(uid) {
                                    if (trade_count <= settings.max_offers) {
                                        $.getJSON("/u/" + uid.toString(16) + "/t/f/" + myuid + "/json/", function(tradable_groups) {
                                            if (trade_count <= settings.max_offers) {
                                                $.getJSON("/u/" + uid.toString(16) + "/t/json/", function(t) {
                                                    var ato2 = [];
                                                    var tradables = {};
                                                    for (platformid in t.by_platform) {
                                                        // add platform restrictions here
                                                        tradables = $.extend(tradables, t.by_platform[platformid]);
                                                    }
                                                    var tradeids = shuffle(Object.keys(tradables));
                                                    tradeids.forEach(function(tradeid) {
                                                        let tradable = tradables[tradeid];
                                                        if (ato2.length < settings.max_want &&
                                                            tradable.extra > 0 &&
                                                            isInWantGroup(tradable_groups, settings.want_from_group, tradable.item_id) &&
                                                            !containsInTradableTitle(tradable, settings.exclude_title_containing) &&
                                                            (settings.trading_cards_only ? tradable.cards > 0 : true) &&
                                                            (settings.unbundled_only ? tradable.bundles_all === 0 : true) &&
                                                            (settings.exclude_givenaway ? tradable.givenaway === 0 : true) &&
                                                            (tradable.reviews_positive ? tradable.reviews_positive > settings.min_rating : true)) {
                                                            ato2.push(tradable.item_id + "," + tradeid);
                                                        }
                                                    });
                                                    if (ato2.length >= parseInt(settings.ratio[1]) && trade_count <= settings.max_offers) {
                                                        trade_count++;
                                                        var trade_data = {
                                                            "app_id": 2,
                                                            "app_version": versionToInteger(GM_info.script.version),
                                                            "to": uid,
                                                            "from_and_or": settings.ratio[0],
                                                            "to_and_or": settings.ratio[1],
                                                            "expire": settings.expire_days,
                                                            "counter_preference": 1,
                                                            "add_to_offer_from[]": ato1,
                                                            "add_to_offer_to[]": ato2,
                                                            "message": settings.message
                                                        };
                                                        console.log(uid, trade_data, trade_count);
                                                        $.post("/u/" + myuid + "/o/json/", trade_data);
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    });
                }
            });
        });
    });
}

function containsInTradableTitle(tradable, pattern) {
    return (tradable.title ? !!tradable.title.match(pattern) : false) ||
        (tradable.title_alt ? !!tradable.title_alt.match(pattern) : false) ||
        (tradable.title_formatted ? !!tradable.title_formatted.match(pattern) : false) ||
        (tradable.title_extra ? !!tradable.title_extra.match(pattern) : false);
}

function isInWantGroup(tradable_groups, want_from_group, item_id) {
    var isInWantGroup = false;
    want_from_group.forEach(function(group) {
        if ($.inArray(item_id, tradable_groups[group]) > -1) {
            isInWantGroup = true;
        }
    });
    return isInWantGroup;
}

function massSendMutualOffers(ratio, expire_days, trade_game, only_offer_trade_game) {
    ratio = ratio ? ratio : "all:1";
    ratio = ratio.replace(/all/g, "0").split(":");
    expire_days = expire_days ? expire_days : 1000;
    trade_game = trade_game ? trade_game : 0;
    only_offer_trade_game = only_offer_trade_game ? only_offer_trade_game : false;
    syncLibrary();
    console.log(ratio, expire_days, trade_game, only_offer_trade_game);
    $.post("/u/" + myuid + "/t/m/?", {
        tradeGame: trade_game,
        tradeUser: -2,
        expandAll: "on",
        openNewTab: "on",
        findMatches: "Mutual Matches"
    }, function(data) {
        data = data.replace(/src="[^"]*"/ig, "");
        console.log($("#mutualMatches tr:has([name=offer_setup])", data).zip("#mutualMatches tr:has([href*='/i/'])", data));
        $("#mutualMatches tr:has([name=offer_setup])", data).zip($("#mutualMatches tr:has([href*='/i/'])", data)).each(function() {
            console.log(this);
            let form = $(this).find("form:has([name=offer_setup])");
            console.log(form);
            let offering = [];
            if (only_offer_trade_game) {
                offering.push(trade_game);
            } else {
                $(this).find(".mh > a").each(function() {
                    offering.push(this.href.split("/")[4]);
                });
            }
            console.log(offering);
            let want = [];
            $(this).find(".mw > a").each(function() {
                want.push(this.href.split("/")[4]);
            });
            console.log(want);
            console.log($(form).attr("action"));
            console.log($(form).serializeObject());
            $.post($(form).attr("action"), $(form).serializeObject(), function(data) {
                data = data.replace(/src="[^"]*"/ig, "");
                let url = $("#offerForm", data).attr("action").split("#")[0];
                console.log(url);
                let ato1 = [];
                $(offering).each(function() {
                    ato1.push($("#exchanges > fieldset:nth-child(3) input[value*='" + this + ",']", data).val());
                });
                console.log(ato1);
                let ato2 = [];
                $(want).each(function() {
                    ato2.push($("#exchanges > fieldset:nth-child(7) input[value*='" + this + ",']", data).val());
                });
                console.log(ato2);
                $.post(url, {
                    offer_setup: [3, 2, 2],
                    "add_to_offer_1[]": ato1,
                    "add_to_offer_2[]": ato2,
                    add_to_offer: "+ Add to Offer"
                }, function() {
                    $.post(url, {
                        offer_setup: [3, 2, 2, 3],
                        from_and_or: parseInt(ratio[0]),
                        to_and_or: parseInt(ratio[1]),
                        expire_days: expire_days,
                        counter_preference: 1,
                        propose_offer: "Finish and Propose Offer"
                    });
                });
            });
        });
    });
}


function messageOffers() {
    var message = prompt("Message:");
    $("#offers tr:visible").each(function() {
        var url = $(this).find("abbr+ a[href*='/u/" + myuid + "/o/']").attr("href");
        $.post(url, {
            offer_message: message,
            offer_setup: 3
        });
    });
}

function cancelOffers(searchquery) {
    if (!searchquery) {
        if (confirm("Are you sure you want to cancel all trade offers displayed below?")) {
            $("#offers tr:visible").each(function() {
                $.post($(this).find("abbr+ a[href*='/u/" + myuid + "/o/']").attr("href"), {
                    offer_setup: 3,
                    cancel_offer: "☒ Cancel Offer"
                });
            });
        }
    } else {
        $.get("/u/" + myuid + "/o/", function(data) {
            data = data.replace(/src="[^"]*"/ig, "");
            $("tr:has(:contains('" + searchquery + "'))", data).each(function() {
                $.post($(this).find("abbr+ a[href*='/u/" + myuid + "/o/']").attr("href"), {
                    offer_setup: 3,
                    cancel_offer: "☒ Cancel Offer"
                });
            });
        });
    }
}

function extendExpiry(expire_days) { //Old solution: SHOULD UPDATE THIS!
    if (!expire_days) {
        expire_days = parseInt(prompt("Expiration:", "15"));
        $("#offers tr:visible").each(function() {
            var url = $(this).find("abbr+ a[href*='/u/" + myuid + "/o/']").attr("href");
            $.post(url, {
                offer_setup: 3,
                edit_offer: "✐ Edit Offer"
            }, function(data) {
                data = data.replace(/src="[^"]*"/ig, "");
                var formdata = $("[name=propose_offer]", data).parents("form").serializeObject();
                formdata.expire_days = expire_days;
                formdata.propose_offer = "Finish and Propose Offer";
                $.post(url, formdata);
            });
        });
    } else {
        $.post("/u/" + myuid + "/o/", {
            filter_by_status: "pending"
        }, function(data) {
            data = data.replace(/src="[^"]*"/ig, "");
            $(".active a:contains('pending')", data).each(function() {
                let url = this.href;
                $.post(url, {
                    offer_setup: 3,
                    edit_offer: "✐ Edit Offer"
                }, function(data) {
                    data = data.replace(/src="[^"]*"/ig, "");
                    var formdata = $("[name=propose_offer]", data).parents("form").serializeObject();
                    formdata.expire_days = expire_days;
                    formdata.propose_offer = "Finish and Propose Offer";
                    $.post(url, formdata);
                });
            });
        });
    }
}

function confirmRemoveOwned() {
    if (confirm("Are you sure you want to remove owned games from pending offers?")) {
        removeOwnedGamesFromPending();
        alert("Initiated process of removing owned games from pending offers!\nCheck the javascript console (F12) for details.\nPlease don't close this tab until all offers have finished updating.");
    }
}

function removeOwnedGamesFromPending() {
    syncLibrary(function() {
        $.post("/u/" + myuid + "/o/", {
            filter_by_status: "pending"
        }, function(data) {
            data = data.replace(/src="[^"]*"/ig, "");
            $(".active a:contains('pending')", data).each(function() {
                let url = this.href;
                $.post(url, {
                    offer_setup: 3,
                    edit_offer: "✐ Edit Offer"
                }, function(data) {
                    data = data.replace(/src="[^"]*"/ig, "");
                    var formdata = $("[name=propose_offer]", data).parents("form").serializeObject();
                    to_remove = [];
                    $("div+ .tradables_items_list li:nth-child(1) , .bold+ li", data).each(function() {
                        if ($(this).find("[alt*=avatar]:first").nextUntil("[alt*=avatar]").text().includes("library")) {
                            to_remove.push($(this).find("[name='checked[]']").val());
                        }
                    });
                    if (to_remove.length > 0) {
                        if ($("div+ .tradables_items_list li:nth-child(1) , .bold+ li", data).length <= to_remove.length) {
                            $.post(url, {
                                offer_setup: 3,
                                cancel_offer: "☒ Cancel Offer"
                            });
                        } else {
                            formdata.remove_offer_items = "➖ Remove Selected Tradables";
                            formdata["checked[]"] = to_remove;
                            $.post(url, formdata, function() {
                                formdata.propose_offer = "Finish and Propose Offer";
                                $.post(url, formdata);
                            });
                        }
                    } else {
                        formdata.propose_offer = "Finish and Propose Offer";
                    }
                });
            });
        });
    });
}


function ajaxify() {
    $("form").on("submit", formSubmitted);
    $("[type=submit]").click(submitClicked);
}

function submitClicked(event) {
    $("input[type=submit]", $(event.target).parents("form")).removeAttr("clicked");
    $(event.target).attr("clicked", "true");
}

function formSubmitted(event) {
    event.preventDefault();
    var form = event.target;
    var submit = $("[type=submit][clicked=true]", form);
    var action = submit.is("[formaction]") ? submit.attr("formaction") : $(form).attr("action");
    var method = $(form).attr("method") || "POST";
    var data = $(form).serializeObject();
    if (submit.attr("name") && submit.attr("value")) data[submit.attr("name")] = submit.attr("value");
    submit.css("cursor", "not-allowed").prop("disabled", true);
    $.ajax({
        url: action,
        method: method,
        data: data,
        success: parseHtml
    });
}

function parseHtml(html) {
    document.documentElement.innerHTML = html;
    initBarter();
}

function serializeObject() {
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || "");
        } else {
            o[this.name] = this.value || "";
        }
    });
    return o;
}

function zip(s) {
    var o = $(s);
    return this.map(function(i, e) {
        return $(e).add($(o[i]));
    });
}

function shuffle(array) {
    var currentIndex = array.length,
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

function getURIParam(sParam) {
    var sPageURL = decodeURIComponent(window.location.search.substring(1)),
        sURLVariables = sPageURL.split("&"),
        sParameterName,
        i;
    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split("=");
        if (sParameterName[0].toLowerCase() === sParam) {
            return sParameterName[1] === undefined ? true : sParameterName[1];
        }
    }
    return false;
}

function versionToInteger(ver) {
    var i = 0;
    ver.split(".").reverse().forEach(function(n, index) {
        i += parseInt(n) * Math.pow(10, 2 * index);
    });
    return i;
}

function applySentenceCase(str) {
    return str.replace(/.+?[\.\?\!](\s|$)/g, function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1);
    });
}

init();
// ==/Code==
