// Конфигурация Supabase
const supabaseUrl = 'https://ukhhxqeynlgdppwfehye.supabase.co';
const supabaseKey = 'sb_publishable_PaCr5kr0f6OqTXDMfeCoiA_jWcRgnJa';

// Инициализация Supabase
window.supabase = window.supabase.createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true
    }
});

// Проверка авторизации
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session && !window.location.pathname.includes('index.html')) {
        window.location.href = 'index.html';
        return null;
    }
    
    if (session) {
        // Обновляем email пользователя на странице
        const userEmailElement = document.getElementById('userEmail');
        if (userEmailElement) {
            userEmailElement.textContent = session.user.email;
        }
    }
    
    return session;
}

// Выход из системы
async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Ошибка при выходе:', error.message);
        alert('Ошибка при выходе из системы');
    }
}

// Удаление аккаунта
async function deleteAccount() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) throw new Error('Пользователь не найден');

        // Удаляем все лекарства пользователя
        const { error: deleteMedicinesError } = await supabase
            .from('medicines')
            .delete()
            .eq('user_id', user.id);

        if (deleteMedicinesError) throw deleteMedicinesError;

        // Удаляем пользователя через административный API
        // В реальном приложении это должно делаться через серверную функцию
        alert('Функция полного удаления аккаунта требует настройки серверной функции в Supabase. Лекарства удалены.');
        
        // Выходим из системы
        await logout();
        
    } catch (error) {
        console.error('Ошибка при удалении аккаунта:', error.message);
        alert('Ошибка при удалении аккаунта: ' + error.message);
    }
}

// Инициализация обработчиков событий авторизации
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logoutBtn');
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    const deleteAccountModal = document.getElementById('deleteAccountModal');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', function() {
            deleteAccountModal.classList.add('show');
        });
    }
    
    if (deleteAccountModal) {
        const cancelBtn = document.getElementById('cancelAccountDeleteBtn');
        const confirmBtn = document.getElementById('confirmAccountDeleteBtn');
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                deleteAccountModal.classList.remove('show');
            });
        }
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', function() {
                deleteAccountModal.classList.remove('show');
                deleteAccount();
            });
        }
        
        // Закрытие модального окна при клике вне его
        deleteAccountModal.addEventListener('click', function(e) {
            if (e.target === deleteAccountModal) {
                deleteAccountModal.classList.remove('show');
            }
        });
    }
});

// Экспорт функций
window.checkAuth = checkAuth;
window.logout = logout;
window.deleteAccount = deleteAccount;
