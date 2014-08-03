"use strict";


(function() {
	var settings;
	var readyTD = new MutationObserver(function(mutations) {
		for (var i = mutations.length - 1; i >= 0; i--) {
			if (mutations[i].target.tagName === "DIV" && mutations[i].target.style.display === "none") {
				readyTD.disconnect();
				ClassAdders();
				document.querySelector('.js-app-columns').addEventListener("DOMNodeInserted", ColumnsObserver);

				document.querySelector('#open-modal').addEventListener("DOMNodeInserted", InsertOpenModalObserver);
				document.querySelector('#open-modal').addEventListener('DOMNodeRemoved', RemoveOpenModalObserver);

				document.querySelector('.js-modals-container').addEventListener("DOMNodeInserted", InsertOpenModalObserver);
				document.querySelector('.js-modals-container').addEventListener("DOMNodeRemoved", RemoveOpenModalObserver);

				document.querySelector('#actions-modal').addEventListener("DOMNodeInserted", InsertOpenModalObserver);
				document.querySelector('#actions-modal').addEventListener("DOMNodeRemoved", RemoveOpenModalObserver);

				document.querySelector('#settings-modal').addEventListener("DOMNodeInserted", SettingsModalObserver);

				addEmojiPanel();
				injectScript(mediaPreviewSize);
			}
		}
	});

	var readyShareTD = new MutationObserver(function(mutations) {
		for (var i = mutations.length - 1; i >= 0; i--) {
			if (mutations[i].target.tagName === "DIV" && mutations[i].target.style.display === "none") {
				readyShareTD.disconnect();
				bodyClasses.add('btd-ready');
			}
		}
	});

	chrome.runtime.onMessage.addListener(function(request) {
		if (!document.body.classList.contains("btd-ready")) {
			readyShareTD.observe(document.querySelector(".js-app-loading"), {attributes: true});
		} else {
			document.dispatchEvent(new CustomEvent('uiComposeTweet'));
			document.querySelector('textarea.js-compose-text').value = request.text + ' ' + request.url;
			document.querySelector('textarea.js-compose-text').dispatchEvent(new Event('change'));
		}
		request = null;
	});

	chrome.storage.sync.get("BTDSettings", function(obj) {
		if (obj.BTDSettings != undefined) {
			settings = obj.BTDSettings;
			readyTD.observe(document.querySelector(".js-app-loading"), {
				attributes: true
			});
		}
	});

	//= include usefulFunctions.js
	//= include timeIsNotRelative.js
	//= include nameDisplay.js
	//= include useFullURL.js
	//= include buildingEmojiComposer.js
	//= include mustacheTemplates.js
	//= include Providers.js
	//= include Thumbnails.js

	function ThemeDetecter() {
		var activatedTheme = document.querySelector('link[rel=stylesheet][href*=app]:not([disabled])').title;
		if (!document.body.classList.contains('btd-dark-theme') && !document.body.classList.contains('btd-light-theme')) {
			document.body.classList.add('btd-' + activatedTheme + '-theme');
		} else {
			document.body.className = document.body.className.replace(/btd-(dark|light)-theme/g, 'btd-' + activatedTheme + '-theme');
		}
	}

	function addEmojiPanel() {
		var emojiURL = chrome.extension.getURL("emojis/emoji-popover.html");
		_ajax(emojiURL, "GET", null, null, function(data) {
			buildingEmojiComposer(data)
		});
	}

	function ClassAdders() {
		var bodyClasses = document.body.classList;
		bodyClasses.add("btd-name_display-" + settings.name_display);
		bodyClasses.add('btd-ready');

		if (settings.circled_avatars) bodyClasses.add('btd-circled_avatars');
		if (settings.no_columns_icons) bodyClasses.add('btd-no_columns_icons');
		if (settings.yt_rm_button) bodyClasses.add('btd-yt_rm_button');
		if (settings.small_icons_compose) bodyClasses.add('btd-small_icons_compose');
		if (settings.only_one_thumbnails) bodyClasses.add('btd-only_one_thumbnail');
		if (settings.grayscale_notification_icons) bodyClasses.add('btd-grayscale_notification_icons');
		if (settings.typeahead_display_username_only) bodyClasses.add('btd-typeahead_display_username_only');
		if (settings.blurred_modals) bodyClasses.add('btd-blurred_modals');
		if (settings.flash_tweets != "false") {
			bodyClasses.add('btd-flash_tweets');
			bodyClasses.add('flash-' + settings.flash_tweets);
		}
		if (settings.minimal_mode) {
			bodyClasses.add('btd-minimal_mode');
			ThemeDetecter();
		}

	}

	function ColumnsObserver(event) {
		var target = event.target;

		if (settings.url_redirection) {
			useFullURL(target);
		}

		if (target.tagName === "ARTICLE") {
			if (settings.timestamp != "relative") {
				timeIsNotRelative(target.querySelector('[datetime]'), settings.timestamp);
			}

			if (settings.name_display == "inverted" || settings.name_display == "username") {
				nameDisplay(target);
			}

			if (!target.querySelector('.media-preview') && target.querySelectorAll('p > a[rel=url]').length > 0) {
				var links = target.querySelectorAll('p > a[rel=url]');
				var link = links[links.length - 1];
				var thumbSize = findParent(target, filterColumn).getAttribute('data-media-preview-size');
				for (var providerName in Providers) {
					if (Providers.hasOwnProperty(providerName) && settings.providers[providerName]) {
						if (Providers[providerName].pattern.regex && new RegExp(Providers[providerName].pattern.string).test(link.href)) {
							Providers[providerName].get(target, thumbSize, link.href, AddPreview);
						} else if (link.href.indexOf(Providers[providerName].pattern.string) != -1) {
							Providers[providerName].get(target, thumbSize, link.href, AddPreview);
						}
					}
				}
			}

		} else if (target.nodeName === "#text" && event.relatedNode.className.indexOf("txt-small") != -1) {
			if (settings.timestamp != "relative") {
				timeIsNotRelative(event.relatedNode.parentNode, "")
			}
		} else if (target.nodeName != "#text" && target.className.indexOf('facet-type') != -1) {
			var sizeChangers = target.querySelectorAll('.column a[data-value]:not(.is-selected):not(.binded)');
			if (sizeChangers) {
				for (var i = 0; i < sizeChangers.length; i++) {
					sizeChangers[i].addEventListener("click", function(event) {
						findParent(event.target, filterColumn).setAttribute('data-media-preview-size', event.target.parentNode.getAttribute('data-value'));
					});
				}
			}

		} else if (target.tagName === "SECTION") {
			injectScript(mediaPreviewSize);
		}
	}

	function InsertOpenModalObserver(event) {
		var target = event.target;
		if (target.nodeName != "#text") {
			if (settings.url_redirection) {
				useFullURL(target);
			}

			document.body.classList.add('btd-open-modal-on');

			var openModalBackPanel = document.querySelector('#open-modal .med-fullpanel');

			if (openModalBackPanel && settings.blurred_modals) {
				openModalBackPanel.addEventListener('click', CloseOpenModal);
			}

			if (settings.timestamp != "relative") {
				timeIsNotRelative(target.querySelector('[datetime]'), settings.timestamp);
			}

			if (settings.name_display == "inverted" || settings.name_display == "username") {
				nameDisplay(target);
			}
		} else if (event.relatedNode.classList.contains('txt-small') && settings.timestamp != "relative") {
			timeIsNotRelative(event.relatedNode.parentNode, settings.timestamp);
		}
	}

	function RemoveOpenModalObserver(event) {
		if ((event.relatedNode.classList.contains('js-modals-container') || event.relatedNode.id == "open-modal") && document.querySelector('#open-modal > *, .js-modals-container, #actions-modal > *') == null) {
			document.body.classList.remove('btd-open-modal-on');
		}
	}

	function SettingsModalObserver(event) {
		// When an event whose relatedNode contains "frm" as class occurs happen, we assume form controls are inserted so we continue
		if (event.relatedNode.className.indexOf('frm') != -1 && settings.minimal_mode) {

			for (var i = 0; i < document.querySelectorAll('input[name=theme]').length; i++) {
				document.querySelectorAll('input[name=theme]')[i].addEventListener('click', ThemeDetecter);
			};

		}
	}

	window.document.onkeydown = function(e) {
		var openModal = document.getElementById("open-modal");
		if (openModal.children.length > 0 && e.keyCode == 27) {
			CloseOpenModal(e);
		}
	}

	window.onresize = ResizeMediaInModal;

	var easter_egg = new Konami(function() {
		// CloseOpenModal(null, true);
		konamiTweets();
	});

})();