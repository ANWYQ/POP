// ==UserScript==
// @name         Bangkok Pride Awardsv4.0
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  优化速度
// @author       ANWY
// @match        https://awards.bangkokpride.org/*
// @icon         https://awards.bangkokpride.org/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    const originalAlert = window.alert;
    window.alert = function(message) {
        console.log("拦截弹窗:", message);
        return;
    };

    if (window.XMLHttpRequest) {
        const originalSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function(body) {
            this.addEventListener('load', function() {
                if (this.status === 200) {
                    console.log("AJAX请求成功");
                }
            });
            return originalSend.apply(this, arguments);
        };
    }

    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        if (response.ok) {
            console.log("Fetch请求成功");
        }
        return response;
    };

    const config = {
        baseDelay: () => Math.random() * 500 + 500,
        voteDelay: () => Math.random() * 2000 + 3000,
        postVoteDelay: () => Math.random() * 100 + 500,
        checkInterval: 1000,
        timeout: 180000
    };

    function clearSessionData() {
        document.cookie.split(";").forEach(cookie => {
            const [name] = cookie.trim().split("=");
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        });
        localStorage.clear();
        sessionStorage.clear();
        console.log('已清除所有会话数据');
    }

    function setupHomepageMonitoring() {
        let timeoutId = null;

        function handleTimeout() {
            console.log('操作超时');
            clearSessionData();
            window.location.reload();
        }

        function checkElements() {
            const voteButton = document.querySelector(
                'section.py-4 button.bg-\\[\\#FF6699\\] a[href="/en/vote/"]'
            );
            if (voteButton) {
                console.log('发现有效投票按钮');
                clearTimeout(timeoutId);
                voteButton.click();
                return true;
            }

            const waitDiv = document.querySelector(
                'section.py-4 div.bg-gray-500'
            );
            if (waitDiv?.textContent.includes('Wait another')) {
                console.log('检测到投票冷却');
                clearSessionData();
                window.location.reload();
                return true;
            }

            return false;
        }

        if (checkElements()) return;

        const intervalId = setInterval(() => {
            if (checkElements()) clearInterval(intervalId);
        }, config.checkInterval);

        timeoutId = setTimeout(() => {
            clearInterval(intervalId);
            handleTimeout();
        }, config.timeout);

        const observer = new MutationObserver(mutations => {
            if (checkElements()) observer.disconnect();
        });
        observer.observe(document, {
            childList: true,
            subtree: true
        });
    }

    const random = {
        string: (min, max) => {
            const length = Math.floor(Math.random() * (max - min + 1)) + min;
            return Array.from({length}, () =>
                String.fromCharCode(97 + Math.floor(Math.random() * 26))
            ).join('');
        },
        year: () => Math.floor(Math.random() * (2000 - 1980 + 1)) + 1980,
        country: () => ["Afghanistan", "Bahrain", "Brazil", "Sudan", "Belize",
                      "Georgia", "France", "Austria", "Benin", "Comoros",
                      "Chad", "Fiji", "Thailand"][Math.floor(Math.random() * 13)],
        email: () => `${random.string(5,8)}${Math.floor(Math.random()*1000)}@${['gmail','qq','yahoo','outlook','163','hotmail','sina','126','sohu'][Math.floor(Math.random()*4)]}.com`
    };

    function waitForElm(selector) {
        return new Promise(resolve => {
            if (document.querySelector(selector)) return resolve(document.querySelector(selector));
            const observer = new MutationObserver(() => {
                if (document.querySelector(selector)) {
                    resolve(document.querySelector(selector));
                    observer.disconnect();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        });
    }

    const selectors = {
        firstCategory: {
            button: '//section[3]//button[contains(@class,"px-3 py-1")]',
            option: '//section[3]//label[10]//span[contains(@class,"text-lg")]'
        },
        secondCategory: {
            button: '//section[6]//button[contains(@class,"px-3 py-1")]',
            option: '//section[6]//label[10]//span[contains(@class,"text-lg")]'
        }
    };

    function xpathSelector(xpath) {
        return document.evaluate(xpath, document, null,
                               XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    }

    async function selectOptions() {
        let cat1Btn = xpathSelector(selectors.firstCategory.button);
        if (cat1Btn) {
            cat1Btn.click();
            await new Promise(r => setTimeout(r, 500));
            let opt1 = xpathSelector(selectors.firstCategory.option);
            if (opt1) opt1.closest('label').click();
        }

        await new Promise(r => setTimeout(r, 300));

        let cat2Btn = xpathSelector(selectors.secondCategory.button);
        if (cat2Btn) {
            cat2Btn.click();
            await new Promise(r => setTimeout(r, 500));
            let opt2 = xpathSelector(selectors.secondCategory.option);
            if (opt2) opt2.closest('label').click();
        }
    }

    async function fillForm() {
        const fieldDelay = () => Math.random() * 10 + 10;

        async function fillField(id, value) {
            const el = document.getElementById(id);
            if (!el) return;

            el.focus();
            await new Promise(r => setTimeout(r, fieldDelay()));

            el.value = '';
            el.dispatchEvent(new Event('input', { bubbles: true }));
            await new Promise(r => setTimeout(r, fieldDelay()));

            for (const char of value.split('')) {
                el.value += char;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                await new Promise(r => setTimeout(r, fieldDelay()));
            }

            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new Event('blur', { bubbles: true }));
            await new Promise(r => setTimeout(r, fieldDelay()));
        }

        await fillField('firstName', random.string(3, 5));
        await fillField('lastName', random.string(3, 5));
        await fillField('birthYear', random.year().toString());
        await fillField('gender', 'Female');
        await fillField('country', random.country().toUpperCase());
        await fillField('email', random.email());
    }

    async function main() {
        if (location.pathname === '/en/') {
            setupHomepageMonitoring();
            return;
        }
        if (location.pathname === '/en/vote/') {
            try {
                await waitForElm('#firstName');
                await fillForm();
                await selectOptions();

                await new Promise(r => setTimeout(r, config.voteDelay()));

                const voteButton = document.querySelector('button[class*="bg-[#FF6699]"]');
                if (voteButton) {
                    voteButton.click();
                    await new Promise(r => setTimeout(r, config.postVoteDelay()));
                    window.location.href = '/en/';
                }
            } catch (error) {
                console.error('投票错误:', error);
                window.location.reload();
            }
        }
    }

    if (document.readyState === 'complete') main();
    else window.addEventListener('load', main);
})();
