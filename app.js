// Конфигурация Supabase
const SUPABASE_URL = 'https://ukhhxqeynlgdppwfehye.supabase.co';
const SUPABASE_KEY = 'sb_publishable_PaCr5kr0f6OqTXDMfeCoiA_jWcRgnJa';

// Инициализация Supabase клиента
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Состояние приложения
let currentUser = null;
let isEditing = false;
let currentFilters = {};

// Элементы DOM
const authSection = document.getElementById('authSection');
const loginForm = document.getElementById('loginForm');
const userInfo = document.getElementById('userInfo');
const mainInterface = document.getElementById('mainInterface');
const userEmailSpan = document.getElementById('userEmail');

const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const logoutBtn = document.getElementById('logoutBtn');

const formContainer = document.getElementById('formContainer');
const medicineForm = document.getElementById('medicineForm');
const medicinesContainer = document.getElementById('medicinesContainer');
const loading = document.getElementById('loading');

const showAddFormBtn = document.getElementById('showAddFormBtn');
const cancelBtn = document.getElementById('cancelBtn');
const refreshBtn = document.getElementById('refreshBtn');
const showAllBtn = document.getElementById('showAllBtn');

const categoryFilter = document.getElementById('categoryFilter');
const expiryFilter = document.getElementById('expiryFilter');
const applyFiltersBtn = document.getElementById('applyFiltersBtn');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');

const totalCount = document.getElementById('totalCount');
const expiredCount = document.getElementById('expiredCount');
const prescriptionCount = document.getElementById('prescriptionCount');
const expiringSoonCount = document.getElementById('expiringSoonCount');

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    setupEventListeners();
});

// Проверка состояния аутентификации
async function checkAuthState() {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
        console.error('Ошибка при проверке сессии:', error);
        return;
    }
    
    if (session?.user) {
        currentUser = session.user;
        updateUIForAuthenticatedUser();
    } else {
        updateUIForUnauthenticatedUser();
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Аутентификация
    loginBtn.addEventListener('click', handleLogin);
    signupBtn.addEventListener('click', handleSignup);
    logoutBtn.addEventListener('click', handleLogout);
    
    // Основные кнопки
    showAddFormBtn.addEventListener('click', () => showForm());
    cancelBtn.addEventListener('click', () => {
        hideForm();
        resetForm();
    });
    refreshBtn.addEventListener('click', () => loadMedicines());
    showAllBtn.addEventListener('click', () => loadMedicines());
    
    // Форма
    medicineForm.addEventListener('submit', handleFormSubmit);
    
    // Фильтры
    applyFiltersBtn.addEventListener('click', applyFilters);
    clearFiltersBtn.addEventListener('click', clearFilters);
    
    // Обработка Enter в форме логина
    document.getElementById('password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
}

// Обработка логина
async function handleLogin() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        alert('Пожалуйста, заполните все поля');
        return;
    }
    
    showLoading();
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        currentUser = data.user;
        updateUIForAuthenticatedUser();
        loadMedicines();
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        alert('Ошибка входа: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Обработка регистрации
async function handleSignup() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        alert('Пожалуйста, заполните все поля');
        return;
    }
    
    if (password.length < 6) {
        alert('Пароль должен содержать минимум 6 символов');
        return;
    }
    
    showLoading();
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    created_at: new Date()
                }
            }
        });
        
        if (error) throw error;
        
        alert('Регистрация успешна! Проверьте вашу почту для подтверждения.');
        
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        alert('Ошибка регистрации: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Обработка выхода
async function handleLogout() {
    showLoading();
    
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        currentUser = null;
        updateUIForUnauthenticatedUser();
        resetForm();
        
    } catch (error) {
        console.error('Ошибка выхода:', error);
        alert('Ошибка при выходе: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Загрузка лекарств
async function loadMedicines() {
    if (!currentUser) return;
    
    showLoading();
    
    try {
        let query = supabase
            .from('medicines')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        // Применение фильтров
        if (currentFilters.category) {
            query = query.eq('category', currentFilters.category);
        }
        
        if (currentFilters.expiry === 'expired') {
            const today = new Date().toISOString().split('T')[0];
            query = query.lt('expiry_date', today);
        } else if (currentFilters.expiry === 'expiring_soon') {
            const today = new Date();
            const nextMonth = new Date();
            nextMonth.setDate(today.getDate() + 30);
            
            query = query.gte('expiry_date', today.toISOString().split('T')[0])
                       .lte('expiry_date', nextMonth.toISOString().split('T')[0]);
        } else if (currentFilters.expiry === 'valid') {
            const today = new Date().toISOString().split('T')[0];
            query = query.gte('expiry_date', today);
        }
        
        const { data: medicines, error } = await query;
        
        if (error) throw error;
        
        displayMedicines(medicines || []);
        updateStats(medicines || []);
        
    } catch (error) {
        console.error('Ошибка при загрузке лекарств:', error);
        showError('Ошибка при загрузке данных: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Отображение лекарств
function displayMedicines(medicines) {
    if (medicines.length === 0) {
        medicinesContainer.innerHTML = `
            <div class="empty-state">
                <p>Лекарств пока нет. Добавьте первое лекарство!</p>
            </div>
        `;
        return;
    }
    
    const today = new Date();
    
    const medicinesHTML = medicines.map(medicine => {
        const expiryDate = new Date(medicine.expiry_date);
        const isExpired = medicine.expiry_date ? expiryDate < today : false;
        const daysUntilExpiry = medicine.expiry_date ? 
            Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24)) : null;
        
        let cardClass = 'medicine-card';
        if (isExpired) {
            cardClass += ' expired';
        } else if (daysUntilExpiry && daysUntilExpiry <= 30) {
            cardClass += ' expiring';
        }
        
        return `
            <div class="${cardClass}" data-id="${medicine.id}">
                <div class="medicine-header">
                    <div class="medicine-name">${medicine.name}</div>
                    <div class="medicine-category">${medicine.category}</div>
                </div>
                <div class="medicine-details">
                    <p><strong>Количество:</strong> ${medicine.quantity} шт.</p>
                    ${medicine.expiry_date ? `<p><strong>Срок годности:</strong> ${formatDate(medicine.expiry_date)}</p>` : ''}
                    ${medicine.storage_place ? `<p><strong>Место хранения:</strong> ${medicine.storage_place}</p>` : ''}
                    ${medicine.description ? `<p><strong>Описание:</strong> ${medicine.description}</p>` : ''}
                    ${medicine.prescription_required ? `<p><strong>⚠️ Требуется рецепт</strong></p>` : ''}
                    ${isExpired ? `<p class="expired-warning">🚨 ПРОСРОЧЕНО!</p>` : ''}
                    ${!isExpired && daysUntilExpiry && daysUntilExpiry <= 30 ? 
                        `<p class="expiring-warning">⚠️ Истекает через ${daysUntilExpiry} дней</p>` : ''}
                </div>
                <div class="medicine-actions">
                    <button onclick="editMedicine(${medicine.id})" class="btn btn-warning">Изменить</button>
                    <button onclick="deleteMedicine(${medicine.id})" class="btn btn-danger">Удалить</button>
                </div>
            </div>
        `;
    }).join('');
    
    medicinesContainer.innerHTML = `
        <div class="medicine-grid">
            ${medicinesHTML}
        </div>
    `;
}

// Редактирование лекарства
async function editMedicine(id) {
    showLoading();
    
    try {
        const { data: medicine, error } = await supabase
            .from('medicines')
            .select('*')
            .eq('id', id)
            .eq('user_id', currentUser.id)
            .single();
        
        if (error) throw error;
        
        if (!medicine) {
            throw new Error('Лекарство не найдено или доступ запрещен');
        }
        
        // Заполняем форму
        document.getElementById('itemId').value = medicine.id;
        document.getElementById('name').value = medicine.name;
        document.getElementById('category').value = medicine.category;
        document.getElementById('quantity').value = medicine.quantity;
        document.getElementById('expiry_date').value = formatDateForInput(medicine.expiry_date);
        document.getElementById('storage_place').value = medicine.storage_place || '';
        document.getElementById('description').value = medicine.description || '';
        document.getElementById('prescription_required').checked = medicine.prescription_required || false;
        
        document.getElementById('formTitle').textContent = 'Редактировать лекарство';
        isEditing = true;
        showForm();
        
    } catch (error) {
        console.error('Ошибка при загрузке лекарства:', error);
        alert('Не удалось загрузить данные для редактирования: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Удаление лекарства
async function deleteMedicine(id) {
    if (!confirm('Вы уверены, что хотите удалить это лекарство?')) return;
    
    showLoading();
    
    try {
        const { error } = await supabase
            .from('medicines')
            .delete()
            .eq('id', id)
            .eq('user_id', currentUser.id);
        
        if (error) throw error;
        
        loadMedicines();
        alert('Лекарство успешно удалено!');
        
    } catch (error) {
        console.error('Ошибка при удалении:', error);
        alert('Ошибка при удалении лекарства: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Обработка формы
async function handleFormSubmit(event) {
    event.preventDefault();
    
    if (!currentUser) {
        alert('Пожалуйста, войдите в систему');
        return;
    }
    
    const formData = {
        name: document.getElementById('name').value.trim(),
        category: document.getElementById('category').value,
        quantity: parseInt(document.getElementById('quantity').value),
        expiry_date: document.getElementById('expiry_date').value || null,
        storage_place: document.getElementById('storage_place').value,
        description: document.getElementById('description').value.trim() || null,
        prescription_required: document.getElementById('prescription_required').checked,
        user_id: currentUser.id,
        updated_at: new Date().toISOString()
    };
    
    if (!formData.name || formData.quantity < 0) {
        alert('Пожалуйста, заполните обязательные поля корректно');
        return;
    }
    
    const itemId = document.getElementById('itemId').value;
    
    showLoading();
    
    try {
        if (isEditing && itemId) {
            // Редактирование
            const { error } = await supabase
                .from('medicines')
                .update(formData)
                .eq('id', itemId)
                .eq('user_id', currentUser.id);
            
            if (error) throw error;
            
            alert('Лекарство успешно обновлено!');
        } else {
            // Добавление
            const { error } = await supabase
                .from('medicines')
                .insert([formData]);
            
            if (error) throw error;
            
            alert('Лекарство успешно добавлено!');
        }
        
        resetForm();
        hideForm();
        loadMedicines();
        
    } catch (error) {
        console.error('Ошибка при сохранении:', error);
        alert('Ошибка при сохранении: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Обновление статистики
function updateStats(medicines) {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(today.getDate() + 30);
    
    const expired = medicines.filter(m => 
        m.expiry_date && new Date(m.expiry_date) < today
    ).length;
    
    const expiringSoon = medicines.filter(m => 
        m.expiry_date && 
        new Date(m.expiry_date) >= today && 
        new Date(m.expiry_date) <= nextMonth
    ).length;
    
    const prescription = medicines.filter(m => m.prescription_required).length;
    
    totalCount.textContent = medicines.length;
    expiredCount.textContent = expired;
    prescriptionCount.textContent = prescription;
    expiringSoonCount.textContent = expiringSoon;
}

// Применение фильтров
function applyFilters() {
    currentFilters = {
        category: categoryFilter.value || null,
        expiry: expiryFilter.value || null
    };
    
    loadMedicines();
}

// Сброс фильтров
function clearFilters() {
    categoryFilter.value = '';
    expiryFilter.value = '';
    currentFilters = {};
    loadMedicines();
}

// Вспомогательные функции
function updateUIForAuthenticatedUser() {
    userEmailSpan.textContent = currentUser.email;
    loginForm.classList.add('hidden');
    userInfo.classList.remove('hidden');
    authSection.classList.add('hidden');
    mainInterface.classList.remove('hidden');
}

function updateUIForUnauthenticatedUser() {
    loginForm.classList.remove('hidden');
    userInfo.classList.add('hidden');
    authSection.classList.remove('hidden');
    mainInterface.classList.add('hidden');
    medicinesContainer.innerHTML = '';
}

function showForm() {
    formContainer.classList.remove('hidden');
}

function hideForm() {
    formContainer.classList.add('hidden');
}

function resetForm() {
    medicineForm.reset();
    document.getElementById('itemId').value = '';
    document.getElementById('storage_place').value = 'Аптечка';
    document.getElementById('formTitle').textContent = 'Добавить новое лекарство';
    isEditing = false;
}

function showLoading() {
    loading.classList.remove('hidden');
    medicinesContainer.classList.add('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
    medicinesContainer.classList.remove('hidden');
}

function showError(message) {
    medicinesContainer.innerHTML = `
        <div class="error-message">
            ${message}
        </div>
    `;
}

function formatDate(dateString) {
    if (!dateString) return 'Не указан';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
}

function formatDateForInput(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}
