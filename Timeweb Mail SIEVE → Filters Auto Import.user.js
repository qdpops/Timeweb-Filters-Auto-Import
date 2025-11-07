// ==UserScript==
// @name         Timeweb Mail SIEVE → Filters Auto Import
// @namespace    https://mail.timeweb.com/
// @version      1.1
// @description  Импорт Sieve-фильтров в почту Timeweb автоматически с сохранением папок
// @match        https://mail.timeweb.com/*
// @run-at       document-idle
// ==/UserScript==

(function() {

    // Добавляем кнопку
    const btn = document.createElement("button");
    btn.textContent = "Импорт фильтров (.sieve)";
    btn.style = "position:fixed; bottom:20px; right:20px; padding:10px 15px; z-index:9999; background:#0077ff;color:#fff;border:none;border-radius:6px; cursor:pointer;";
    document.body.appendChild(btn);

    btn.onclick = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".sieve,.txt";
        input.onchange = e => readFile(e.target.files[0]);
        input.click();
    };

    // Получаем csrf из cookie
    function getCookie(name) {
        return document.cookie.split("; ").find(row => row.startsWith(name+"="))?.split("=")[1];
    }

    const csrf = getCookie("api_csrf");
    if (!csrf) console.warn("⚠ Не найден api_csrf — обнови страницу перед запуском.");

    // Читаем файл
    function readFile(file) {
        const reader = new FileReader();
        reader.onload = () => parseSieve(reader.result);
        reader.readAsText(file);
    }

    // Парсим Sieve и извлекаем email → папка
    function parseSieve(text) {
        const regex = /if\s+header\s+:contains\s+"from"\s+"([^"]+)"[\s\S]*?fileinto\s+"([^"]+)";/g;
        let match;
        const rules = [];

        while ((match = regex.exec(text)) !== null) {
            rules.push({
                email: match[1],
                //folder: match[2]
                folder: match[2].replace(/\//g, '.')
            });
        }

        console.log("Найдено правил:", rules.length, rules);
        sendRules(rules);
    }

    // Отправляем правила на сервер
    async function sendRules(rules) {
        for (const r of rules) {

            const body = {
                active: true,
                conditions: { conditions: [{ field: "from", operator: "contains", value: r.email }], operator: "and", scopes: [] },
                markFlagged: false,
                markSeen: false,
                moveTo: r.folder,
                applyToExisted: true,
                onlyThis: true,
                sendTelegrams: [],
                toDelete: false,
                sendEmails: [],
                labelIds: []
            };

            console.log("Отправляем:", r.email, "→", r.folder);

            try {
                const res = await fetch("https://api-mail.timeweb.com/email-rule", {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "content-type": "application/json",
                        "x-csrf": csrf,
                        "x-app-id": "b1125d4e-6f00-442d-873c-a7d952cfb896"
                    },
                    body: JSON.stringify(body)
                });

                const json = await res.json();
                console.log("✅", json);
            } catch(err) {
                console.log("❌", err);
            }

            // небольшая задержка, чтобы сервер не ругался
            await new Promise(r => setTimeout(r, 600));
        }

        alert("🎉 Импорт завершен!");
    }

})();
