// Configuración de Google Sheets
const SHEET_ID = '1yCQ-cJJ7PALDYSwIcpsj1ZfACtNLJwfOR7HY-mPzgx4';
const SHEET_NAME = 'Hoja 1';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;

// ⭐ Configuración de EmailJS ⭐
const EMAILJS_CONFIG = {
    serviceID: 'service_o2zvkzo',
    templateID: 'template_usum2d8',
    userID: '_gOxtGSQmrhTdoRuX'
};

// Función para obtener datos de Google Sheets (ignorando encabezados)
async function obtenerClientes() {
    try {
        const response = await fetch(SHEET_URL);
        const text = await response.text();
        const jsonStr = text.substring(text.indexOf('(') + 1, text.lastIndexOf(')'));
        const data = JSON.parse(jsonStr);
        const rows = data.table.rows;
        
        // Ignorar la primera fila (encabezados)
        const clientes = [];
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const values = row.c.map(cell => cell ? cell.v : '');
            
            const contrasena = String(values[0] || '').trim();
            const correo = String(values[3] || '').trim();
            
            if (correo) {
                clientes.push({
                    contrasena: contrasena,
                    correo: correo
                });
            }
        }
        
        console.log('📋 Clientes cargados:', clientes.length);
        return clientes;
    } catch (error) {
        console.error('Error al obtener datos:', error);
        return [];
    }
}

// Función para autenticar usuario
async function autenticarUsuario(email, password) {
    const clientes = await obtenerClientes();
    
    const emailLimpio = String(email).trim().toLowerCase();
    const passwordLimpio = String(password).trim();
    
    const cliente = clientes.find(c => 
        String(c.correo).trim().toLowerCase() === emailLimpio
    );
    
    console.log('🔍 Buscando:', emailLimpio);
    console.log('📋 Clientes encontrados:', clientes.map(c => c.correo));
    
    if (!cliente) {
        return { success: false, message: '❌ Correo no registrado. Contacta a tu asesor.' };
    }
    
    const contrasenaLimpia = String(cliente.contrasena).trim();
    
    console.log('🔑 Contraseña guardada:', contrasenaLimpia);
    console.log('🔑 Contraseña ingresada:', passwordLimpio);
    console.log('🔑 ¿Coinciden?', contrasenaLimpia === passwordLimpio);
    
    if (contrasenaLimpia !== passwordLimpio) {
        return { success: false, message: '❌ Contraseña incorrecta. Intenta de nuevo.' };
    }
    
    return { 
        success: true, 
        message: '✅ Inicio de sesión exitoso',
        email: cliente.correo
    };
}

// Función para recuperar contraseña
async function recuperarContrasena(email) {
    const clientes = await obtenerClientes();
    const emailLimpio = String(email).trim().toLowerCase();
    
    const cliente = clientes.find(c => 
        String(c.correo).trim().toLowerCase() === emailLimpio
    );
    
    if (!cliente) {
        return { 
            success: false, 
            message: '❌ El correo que ingresaste no está registrado como cliente. Para registrarte, contáctate con un asesor.',
            showWhatsApp: true
        };
    }
    
    try {
        const emailDestino = String(cliente.correo).trim();
        const nombreDestino = emailDestino.split('@')[0] || 'Cliente';
        const contrasenaCliente = String(cliente.contrasena).trim();
        
        if (!emailDestino) {
            throw new Error('El correo del cliente está vacío');
        }
        
        console.log('📧 Enviando correo a:', emailDestino);
        
        const templateParams = {
            to_email: emailDestino,
            to_name: nombreDestino,
            password: contrasenaCliente
        };
        
        const response = await emailjs.send(
            EMAILJS_CONFIG.serviceID,
            EMAILJS_CONFIG.templateID,
            templateParams,
            EMAILJS_CONFIG.userID
        );
        
        console.log('✅ Respuesta de EmailJS:', response);
        
        if (response.status === 200) {
            return {
                success: true,
                message: `✅ Se ha enviado tu contraseña al correo: ${emailDestino}`
            };
        } else {
            throw new Error('Error al enviar el correo: ' + response.text);
        }
    } catch (error) {
        console.error('❌ Error al enviar email:', error);
        
        return {
            success: false,
            message: '❌ No se pudo enviar el correo electrónico. Por favor, contáctate con tu asesor por WhatsApp para recibir tu contraseña.',
            showWhatsApp: true
        };
    }
}

// --- Funciones para el Login ---

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    const loginBtn = document.getElementById('loginBtn');
    
    errorDiv.classList.remove('show');
    successDiv.classList.remove('show');
    
    if (!email || !password) {
        errorDiv.querySelector('#errorText').textContent = 'Por favor, completa todos los campos.';
        errorDiv.classList.add('show');
        return false;
    }
    
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="loading-spinner"></span> Verificando...';
    
    try {
        const result = await autenticarUsuario(email, password);
        
        if (result.success) {
            sessionStorage.setItem('userLoggedIn', 'true');
            sessionStorage.setItem('userEmail', result.email);
            
            successDiv.querySelector('#successText').textContent = '¡Bienvenido! Redirigiendo...';
            successDiv.classList.add('show');
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            errorDiv.querySelector('#errorText').textContent = result.message;
            errorDiv.classList.add('show');
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
        }
    } catch (error) {
        console.error('❌ Error en login:', error);
        errorDiv.querySelector('#errorText').textContent = 'Error al conectar con el servidor. Intenta de nuevo.';
        errorDiv.classList.add('show');
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
    }
    
    return false;
}

// --- Funciones para Recuperar Contraseña ---

async function handleRecuperar(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const messageBox = document.getElementById('messageBox');
    const recuperarBtn = document.getElementById('recuperarBtn');
    const whatsappBtnContainer = document.getElementById('whatsappBtnContainer');
    
    if (whatsappBtnContainer) {
        whatsappBtnContainer.style.display = 'none';
    }
    
    messageBox.className = 'message-box';
    messageBox.textContent = '';
    
    if (!email) {
        messageBox.className = 'message-box error';
        messageBox.textContent = 'Por favor, ingresa tu correo electrónico.';
        return false;
    }
    
    recuperarBtn.disabled = true;
    recuperarBtn.innerHTML = '<span class="loading-spinner"></span> Enviando...';
    
    try {
        const result = await recuperarContrasena(email);
        
        if (result.success) {
            messageBox.className = 'message-box success';
            messageBox.textContent = result.message;
        } else {
            messageBox.className = 'message-box error';
            messageBox.textContent = result.message;
            
            if (result.showWhatsApp) {
                if (whatsappBtnContainer) {
                    whatsappBtnContainer.style.display = 'block';
                    whatsappBtnContainer.innerHTML = `
                        <p style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-gray);">
                            <i class="fas fa-info-circle"></i> ¿Necesitas ayuda? 
                            <a href="https://wa.me/525540148827" target="_blank" style="color: var(--accent-orange); font-weight: 600;">
                                Contáctate con un asesor <i class="fab fa-whatsapp"></i>
                            </a>
                        </p>
                    `;
                }
            }
        }
    } catch (error) {
        console.error('❌ Error en recuperar:', error);
        messageBox.className = 'message-box error';
        messageBox.textContent = 'Error al conectar con el servidor. Intenta de nuevo.';
    }
    
    recuperarBtn.disabled = false;
    recuperarBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar contraseña';
    
    return false;
}

// --- Función para cerrar sesión ---

function cerrarSesion() {
    sessionStorage.clear();
    window.location.href = 'login.html';
}

// --- Verificar sesión activa ---

function verificarSesion() {
    const isLoggedIn = sessionStorage.getItem('userLoggedIn') === 'true';
    const currentPage = window.location.pathname.split('/').pop();
    const protectedPages = ['dashboard.html'];
    const authPages = ['login.html', 'recuperar.html'];
    
    if (protectedPages.includes(currentPage) && !isLoggedIn) {
        window.location.href = 'login.html';
        return false;
    }
    
    if (authPages.includes(currentPage) && isLoggedIn) {
        window.location.href = 'dashboard.html';
        return false;
    }
    
    return true;
}

// Ejecutar verificación al cargar la página
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', verificarSesion);
}
