// ==UserScript==
// @name         Bangkok Pride Awards v5.1
// @namespace    http://tampermonkey.net/
// @version      1.4.2
// @description  适度优化投票速度
// @author       ANWY
// @match        https://awards.bangkokpride.org/*
// @icon         https://awards.bangkokpride.org/favicon.ico
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    window.alert = function(message) {
        console.log("[拦截弹窗]:", message);
        return false;
    };

    if (window.XMLHttpRequest) {
        const originalSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function(body) {
            this.addEventListener('load', function() {
                console.log(`[AJAX请求] ${this.status} ${this.responseURL}`);
            });
            return originalSend.apply(this, arguments);
        };
    }

    const config = {
        baseDelay: () => Math.random() * 300 + 200,
        voteDelay: () => Math.random() * 1500 + 1500,
        fieldDelay: () => Math.random() * 30 + 20,
        checkInterval: 750,
        timeout: 9000
    };

    function clearSessionData() {
        document.cookie.split(";").forEach(cookie => {
            const [name] = cookie.trim().split("=");
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        });
        localStorage.clear();
        sessionStorage.clear();
        console.log('[清理] 已清除所有会话数据');
    }

    const random = {
        string: (min, max) => {
            const length = Math.floor(Math.random() * (max - min + 1)) + min;
            return Array.from({ length }, () =>
                String.fromCharCode(97 + Math.floor(Math.random() * 26))
            ).join('');
        },
        year: () => Math.floor(Math.random() * (2000 - 1980 + 1)) + 1980,
        country: () => ["THAILAND", "USA", "UK", "JAPAN", "KOREA"][Math.floor(Math.random() * 5)],
        email: () => `${random.string(5, 8)}${Math.floor(Math.random() * 1000)}@gmail.com`
    };

    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }

            const timer = setTimeout(() => {
                observer.disconnect();
                reject(new Error(`等待元素超时: ${selector}`));
            }, timeout);

            const observer = new MutationObserver(() => {
                if (document.querySelector(selector)) {
                    clearTimeout(timer);
                    observer.disconnect();
                    resolve(document.querySelector(selector));
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }

    function xpath(query) {
        const result = document.evaluate(
            query,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        );
        return result.singleNodeValue;
    }

    const categories = {
        ySeriesStar: {
            button: '//section[@data-award-id="2"]//button[contains(@class, "px-3")]',
            option: '//section[@data-award-id="2"]//label[@for="2-3"]'
        },
        sapphicStar: {
            button: '//section[@data-award-id="3"]//button[contains(@class, "px-3")]',
            option: '//section[@data-award-id="3"]//label[10]'
        },
        seriesDrama: {
            button: '//section[@data-award-id="6"]//button[contains(@class, "px-3")]',
            option: '//section[@data-award-id="6"]//label[10]'
        }
    };

    async function fillForm() {
        const fields = [
            { id: 'firstName', value: random.string(3, 5) },
            { id: 'lastName', value: random.string(3, 5) },
            { id: 'birthYear', value: random.year() },
            { id: 'gender', value: 'Female' },
            { id: 'country', value: random.country() },
            { id: 'email', value: random.email() }
        ];

        for (const field of fields) {
            const el = document.getElementById(field.id);
            if (!el) continue;

            el.value = '';
            await new Promise(r => setTimeout(r, config.fieldDelay()));

            for (const char of String(field.value)) {
                el.value += char;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                await new Promise(r => setTimeout(r, 15));
            }

            el.dispatchEvent(new Event('change', { bubbles: true }));
            await new Promise(r => setTimeout(r, config.fieldDelay()));
        }
    }

    async function selectOptions() {
        for (const [name, category] of Object.entries(categories)) {
            try {
                console.log(`[投票] 正在处理分类: ${name}`);

                const btn = xpath(category.button);
                if (btn) {
                    btn.click();
                    await new Promise(r => setTimeout(r, 400));

                    const option = xpath(category.option);
                    if (option) {
                        option.click();
                        console.log(`[投票] 已选择: ${option.textContent.trim()}`);
                    }

                    await new Promise(r => setTimeout(r, 400));
                }
            } catch (error) {
                console.error(`[错误] 处理分类 ${name} 时出错:`, error);
            }
        }
    }

    async function main() {
        try {
            if (location.pathname === '/en/') {
                console.log('[状态] 检测到首页');

                const cooldown = document.querySelector('div.bg-gray-500');
                if (cooldown?.textContent.includes('Wait another')) {
                    console.log('[冷却] 检测到投票冷却时间');
                    clearSessionData();
                    return window.location.reload();
                }

                const voteBtn = await waitForElement('a[href="/en/vote/"]');
                voteBtn.click();
                return;
            }

            if (location.pathname === '/en/vote/') {
                console.log('[状态] 进入投票页面');

                await waitForElement('#firstName');
                await fillForm();
                await selectOptions();

                await new Promise(r => setTimeout(r, config.voteDelay()));

                const submitBtn = await waitForElement('button.bg-\\[\\#FF6699\\]');
                submitBtn.click();

                await new Promise(r => setTimeout(r, 1500));
                window.location.href = '/en/';
            }
        } catch (error) {
            console.error('[错误] 主流程出错:', error);
            clearSessionData();
            window.location.reload();
        }
    }

    if (document.readyState === 'complete') {
        main();
    } else {
        window.addEventListener('load', main);
    }
})();
