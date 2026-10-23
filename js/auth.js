// Configuración de Google Sheets
const SHEET_ID = '1yCQ-cJJ7PALDYSwIcpsj1ZfACtNLJwfOR7HY-mPzgx4';
const SHEET_NAME = 'Hoja 1';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;

// ⭐ Configuración de EmailJS (legado, ya no se usa para recuperación)
const EMAILJS_CONFIG = {
    serviceID: 'service_o2zvkzo',
    templateID: 'template_usum2d8',
    userID: '_gOxtGSQmrhTdoRuX'
};

// ⭐ Variable global para almacenar el código del cliente
let codigoClienteGlobal = null;

// Función para obtener datos de Google Sheets (ignorando encabezados)
async function obtenerClientes() {
    try {
        const response = await fetch(SHEET_URL);
        const text = await response.text();
        const jsonStr = text.substring(text.indexOf('(') + 1, text.lastIndexOf(')'));
        const data = JSON.parse(jsonStr);
        const rows = data.table.rows;
        
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

// ⭐ NUEVA FUNCIÓN: Obtener código de cliente por email
async function obtenerCodigoCliente(email) {
    try {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;
        const response = await fetch(url);
        const text = await response.text();
        const jsonStr = text.substring(text.indexOf('(') + 1, text.lastIndexOf(')'));
        const data = JSON.parse(jsonStr);
        const rows = data.table.rows;
        
        for (let i = 1; i < rows.length; i++) {
            const values = rows[i].c.map(cell => cell ? cell.v : '');
            const correo = String(values[3] || '').trim();
            
            if (correo.toLowerCase() === email.toLowerCase()) {
                const codigo = String(values[0] || '').trim();
                console.log('🔑 Código de cliente encontrado:', codigo);
                return codigo;
            }
        }
        return null;
    } catch (error) {
        console.error('Error al obtener código de cliente:', error);
        return null;
    }
}

// Función para autenticar usuario (a través del Worker)
async function autenticarUsuario(email, password) {
    try {
        const response = await fetch('https://proconstruccionmx-proxy.proconstruccionmx.workers.dev/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                email: email.trim(),
                password: password
            })
        });

        const result = await response.json();

        if (!result.success) {
            return {
                success: false,
                message: '❌ ' + (result.message || 'Credenciales incorrectas')
            };
        }

        // Guardar código de cliente en sessionStorage
        if (result.cliente && result.cliente.codigo) {
            codigoClienteGlobal = result.cliente.codigo;
            sessionStorage.setItem('codigoCliente', result.cliente.codigo);
        }

                return {
            success: true,
            message: '✅ Inicio de sesión exitoso',
            email: result.cliente ? result.cliente.correo : email,
            codigo: result.cliente ? result.cliente.codigo : null,
            token: result.token || null
        };
    } catch (error) {
        console.error('❌ Error en login:', error);
        return {
            success: false,
            message: '❌ Error al conectar con el servidor. Intenta de nuevo.'
        };
    }
}

// ⭐ FUNCIÓN ACTUALIZADA: Recuperar contraseña a través del Worker
async function recuperarContrasena(email) {
    try {
        console.log('📧 Solicitando recuperación para:', email);
        
        const response = await fetch('https://proconstruccionmx-proxy.proconstruccionmx.workers.dev/reset', {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'solicitarReset',
                email: email.trim()
            })
        });
        
        const result = await response.json();
        
        console.log('📥 Respuesta del Worker:', result);
        
        if (result.success) {
            return {
                success: true,
                message: result.message || '✅ Se ha enviado tu contraseña al correo.'
            };
        } else {
            return {
                success: false,
                message: result.message || '❌ No se pudo enviar el correo.',
                showWhatsApp: result.showWhatsApp || false
            };
        }
        
    } catch (error) {
        console.error('❌ Error en recuperación:', error);
        return {
            success: false,
            message: '❌ Error al conectar con el servidor. Intenta de nuevo.',
            showWhatsApp: false
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
            if (result.codigo) {
                sessionStorage.setItem('codigoCliente', result.codigo);
            }
            // ⭐ GUARDAR TOKEN DE SESIÓN
            if (result.token) {
                sessionStorage.setItem('sessionToken', result.token);
            }
            
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
                            <a href="https://wa.me/525540148827?text=Hola%2C%20quisiera%20registrarme%20como%20cliente%20en%20ProConstrucci%C3%B3nMX" target="_blank" style="color: var(--accent-orange); font-weight: 600;">
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
