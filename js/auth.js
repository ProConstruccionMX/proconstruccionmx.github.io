// Configuración de Google Sheets
const SHEET_ID = '1yCQ-cJJ7PALDYSwIcpsj1ZfACtNLJwfOR7HY-mPzgx4';
const SHEET_NAME = 'Hoja 1';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;

// ⭐ URL DE TU WEB APP DE GOOGLE APPS SCRIPT PARA DIRECCIONES ⭐
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwhr9o62Wum1jAlAd7T3x9KYFjk8ObQ2uMbJpb_DYF0lLhloDKl_PxDlUx8wnAaF5AH/exec';

// ⭐ Configuración de EmailJS ⭐
const EMAILJS_CONFIG = {
    serviceID: 'service_o2zvkzo',
    templateID: 'template_usum2d8',
    userID: '_gOxtGSQmrhTdoRuX'
};

// ⭐ Variable global para almacenar el código del cliente
let codigoClienteGlobal = sessionStorage.getItem('codigoCliente') || null;

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
        return clientes;
    } catch (error) {
        console.error('Error al obtener datos:', error);
        return [];
    }
}

// ⭐ Obtener código de cliente por email
async function obtenerCodigoCliente(email) {
    try {
        const response = await fetch(SHEET_URL);
        const text = await response.text();
        const jsonStr = text.substring(text.indexOf('(') + 1, text.lastIndexOf(')'));
        const data = JSON.parse(jsonStr);
        const rows = data.table.rows;
        
        for (let i = 1; i < rows.length; i++) {
            const values = rows[i].c.map(cell => cell ? cell.v : '');
            const correo = String(values[3] || '').trim();
            
            if (correo.toLowerCase() === email.toLowerCase()) {
                const codigo = String(values[0] || '').trim();
                return codigo;
            }
        }
        return null;
    } catch (error) {
        console.error('Error al obtener código de cliente:', error);
        return null;
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
    
    if (!cliente) {
        return { success: false, message: '❌ Correo no registrado. Contacta a tu asesor.' };
    }
    
    const contrasenaLimpia = String(cliente.contrasena).trim();
    if (contrasenaLimpia !== passwordLimpio) {
        return { success: false, message: '❌ Contraseña incorrecta. Intenta de nuevo.' };
    }
    
    const codigo = await obtenerCodigoCliente(email);
    if (codigo) {
        codigoClienteGlobal = codigo;
        sessionStorage.setItem('codigoCliente', codigo);
    }
    
    return { 
        success: true, 
        message: '✅ Inicio de sesión exitoso',
        email: cliente.correo,
        codigo: codigo
    };
}

// Función para recuperar contraseña
async function recuperarContrasena(email) {
    const clientes = await obtenerClientes();
    const emailLimpio = String(email).trim().toLowerCase();
    const cliente = clientes.find(c => String(c.correo).trim().toLowerCase() === emailLimpio);
    
    if (!cliente) {
        return { success: false, message: '❌ El correo que ingresaste no está registrado.', showWhatsApp: true };
    }
    
    try {
        const emailDestino = String(cliente.correo).trim();
        const nombreDestino = emailDestino.split('@')[0] || 'Cliente';
        const contrasenaCliente = String(cliente.contrasena).trim();
        
        const templateParams = { to_email: emailDestino, to_name: nombreDestino, password: contrasenaCliente };
        const response = await emailjs.send(EMAILJS_CONFIG.serviceID, EMAILJS_CONFIG.templateID, templateParams, EMAILJS_CONFIG.userID);
        
        if (response.status === 200) {
            return { success: true, message: `✅ Se ha enviado tu contraseña al correo: ${emailDestino}` };
        } else {
            throw new Error('Error al enviar el correo');
        }
    } catch (error) {
        return { success: false, message: '❌ No se pudo enviar el correo electrónico.', showWhatsApp: true };
    }
}

// --- Manejo del Login ---
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
            successDiv.querySelector('#successText').textContent = '¡Bienvenido! Redirigiendo...';
            successDiv.classList.add('show');
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
        } else {
            errorDiv.querySelector('#errorText').textContent = result.message;
            errorDiv.classList.add('show');
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
        }
    } catch (error) {
        errorDiv.querySelector('#errorText').textContent = 'Error al conectar con el servidor.';
        errorDiv.classList.add('show');
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
    }
    return false;
}

// --- Manejo de Recuperación ---
async function handleRecuperar(event) {
    event.preventDefault();
    const email = document.getElementById('email').value.trim();
    const messageBox = document.getElementById('messageBox');
    const recuperarBtn = document.getElementById('recuperarBtn');
    
    messageBox.className = 'message-box';
    messageBox.textContent = '';
    
    if (!email) {
        messageBox.className = 'message-box error';
        messageBox.textContent = 'Por favor, ingresa tu correo electrónico.';
        return false;
    }
    
    recuperarBtn.disabled = true;
    recuperarBtn.innerHTML = '<span class="loading-spinner"></span> Enviando...';
    
    const result = await recuperarContrasena(email);
    messageBox.className = `message-box ${result.success ? 'success' : 'error'}`;
    messageBox.textContent = result.message;
    
    recuperarBtn.disabled = false;
    recuperarBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar contraseña';
    return false;
}

// --- Control de Sesión ---
function cerrarSesion() {
    sessionStorage.clear();
    window.location.href = 'login.html';
}

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

// --- ⭐ GESTIÓN DE MENÚ DESPLEGABLE Y DIRECCIONES ---
function toggleMenuCuenta() {
    const menu = document.getElementById('menuDesplegableCuenta');
    if (menu) {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
}

// Cerrar menú si se hace clic fuera
window.addEventListener('click', function(e) {
    if (!e.target.closest('#btnMiCuenta') && !e.target.closest('#menuDesplegableCuenta')) {
        const menu = document.getElementById('menuDesplegableCuenta');
        if (menu) menu.style.display = 'none';
    }
});

// Función para obtener las direcciones desde Apps Script
async function obtenerDireccionesCliente() {
    const codigo = sessionStorage.getItem('codigoCliente');
    if (!codigo) return [];
    try {
        const response = await fetch(`${APPS_SCRIPT_URL}?codigoCliente=${codigo}`);
        const data = await response.json();
        if (data.success) {
            return data.direcciones;
        }
        return [];
    } catch (error) {
        console.error('Error al listar direcciones:', error);
        return [];
    }
}

// Eliminar dirección
async function eliminarDireccionCliente(fila) {
    if (!confirm('¿Estás seguro de eliminar esta dirección?')) return;
    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'eliminar', fila: fila })
        });
        const result = await response.json();
        if (result.success) {
            alert('Dirección eliminada correctamente');
            abrirModalDirecciones(); // Recargar modal
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error al eliminar:', error);
    }
}

// Abrir modal de gestión de direcciones
async function abrirModalDirecciones() {
    const menu = document.getElementById('menuDesplegableCuenta');
    if (menu) menu.style.display = 'none';

    let modal = document.getElementById('modalDirecciones');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalDirecciones';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal" style="max-width: 700px;">
                <div class="modal-header">
                    <h2>Mis Direcciones Registradas</h2>
                    <button class="modal-close" onclick="document.getElementById('modalDirecciones').classList.remove('active')">&times;</button>
                </div>
                <div id="contenidoDirecciones" style="max-height: 60vh; overflow-y: auto;">
                    <p>Cargando direcciones...</p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    modal.classList.add('active');
    const contenedor = document.getElementById('contenidoDirecciones');
    contenedor.innerHTML = '<p><span class="loading-spinner"></span> Cargando direcciones...</p>';

    const direcciones = await obtenerDireccionesCliente();
    
    if (direcciones.length === 0) {
        contenedor.innerHTML = '<p class="text-center" style="padding: 2rem; color: var(--text-gray);">No tienes direcciones registradas.</p>';
        return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 1rem;">';
    direcciones.forEach(dir => {
        html += `
            <div style="background: var(--gray-light); padding: 1rem; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h4 style="color: var(--primary-dark); margin-bottom: 0.3rem;"><i class="fas fa-map-marker-alt" style="color: var(--accent-orange);"></i> ${dir.nombre}</h4>
                    <p style="font-size: 0.9rem; color: var(--text-gray); margin: 0;">${dir.calle}, Col. ${dir.colonia}, ${dir.alcaldia}, ${dir.estado}, C.P. ${dir.cp}</p>
                    <p style="font-size: 0.85rem; color: var(--text-gray);">Recibe: <strong>${dir.nombreRecibe}</strong> | Tel: ${dir.telefono}</p>
                </div>
                <div>
                    <button class="btn btn-danger" onclick="eliminarDireccionCliente(${dir.fila})" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    contenedor.innerHTML = html;
}

// Ejecutar verificación al cargar la página
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', verificarSesion);
}
