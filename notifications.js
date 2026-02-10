// Инициализация уведомлений
function initNotifications() {
    // Проверяем поддержку уведомлений
    if (!("Notification" in window)) {
        console.log("Браузер не поддерживает уведомления");
        return;
    }

    // Проверяем разрешение на уведомления
    if (Notification.permission === "granted") {
        console.log("Уведомления разрешены");
        scheduleNotifications();
    } else if (Notification.permission !== "denied") {
        // Запрашиваем разрешение
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                console.log("Разрешение на уведомления получено");
                scheduleNotifications();
            }
        });
    }

    // Проверяем лекарства при загрузке страницы
    checkAndNotify();
}

// Проверка и отправка уведомлений
function checkAndNotify() {
    if (!medicines || medicines.length === 0) return;

    const today = new Date();
    const notifications = [];

    medicines.forEach(medicine => {
        const expDate = new Date(medicine.expiration_date);
        const timeDiff = expDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        // Уведомление о просроченных лекарствах
        if (daysDiff < 0) {
            notifications.push({
                title: "⚠️ Лекарство просрочено!",
                body: `${medicine.name} просрочено ${Math.abs(daysDiff)} дней назад`,
                days: daysDiff
            });
        }
        // Уведомление о скором истечении срока (в течение 7 дней)
        else if (daysDiff <= 7 && daysDiff >= 0) {
            notifications.push({
                title: "⏰ Срок годности истекает",
                body: `${medicine.name} истекает через ${daysDiff} дней`,
                days: daysDiff
            });
        }
    });

    // Показываем уведомления
    notifications.forEach(notification => {
        showNotification(notification.title, notification.body);
    });
}

// Показ уведомления
function showNotification(title, body) {
    if (Notification.permission === "granted") {
        const notification = new Notification(title, {
            body: body,
            icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%231e88e5'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/%3E%3C/svg%3E",
            tag: "pharmacy-notification"
        });

        // Закрытие уведомления при клике
        notification.onclick = function() {
            window.focus();
            notification.close();
        };

        // Автоматическое закрытие через 10 секунд
        setTimeout(() => {
            notification.close();
        }, 10000);
    }
}

// Планирование регулярных проверок
function scheduleNotifications() {
    // Проверяем каждые 4 часа
    setInterval(checkAndNotify, 4 * 60 * 60 * 1000);
    
    // Также проверяем при каждом обновлении списка лекарств
    const originalLoadMedicines = window.loadMedicines;
    window.loadMedicines = async function() {
        await originalLoadMedicines();
        checkAndNotify();
    };
}

// Экспорт функций
window.initNotifications = initNotifications;
window.checkAndNotify = checkAndNotify;
