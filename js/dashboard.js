// ============================================
// CONFIGURACIÓN
// ============================================

const WORKER_URL = 'https://proconstruccionmx-proxy.proconstruccionmx.workers.dev';

// ⭐ Nombres de hoja (necesarios para guardarFilaGoogleSheets)
const HOJA_PRODUCTOS = 'Hoja 1';
const HOJA_BASE_CLIENTES = 'Hoja 1';
const HOJA_DIRECCIONES = 'Direcciones';
const HOJA_FACTURACION = 'Facturacion';
const HOJA_EST_PRODUCTOS = 'Productos';
const HOJA_EST_CLIENTES = 'Clientes';
const HOJA_PRECIOS_ESPECIALES = 'Hoja 1';

const EMAIL_VENTAS = 'ventas@proconstruccionmx.com';
const DIAS_CREDITO_FIJO = 20;
const SUCURSAL_WEB = 'Web';
const PESO_MINIMO_TONELADA = 1000;

let clienteData = null;
let productosGlobales = [];
let preciosEspecialesGlobales = [];
let carrito = [];
let pagoSeleccionado = null;
let comprobanteBase64 = null;
let comprobanteNombre = null;
let comprobanteTipo = null;
let direccionesCliente = [];
let facturacionCliente = [];
let direccionSeleccionadaId = null;
let requiereFactura = false;
let datosFacturaSeleccionados = null;

let historialVentas = [];
let ventasDetalladas = [];
let productosMasComprados = [];

let clienteCreditoHabilitado = false;
let clienteLimiteCreditoPeso = 0;
let clienteLimiteCreditoMonto = 0;

let infoCreditoCalculado = null;

let creditosPendientes = [];
let creditoSeleccionadoParaPago = null;

let comprobanteCreditoBase64 = null;
let comprobanteCreditoNombre = null;

let fechaEntregaSeleccionada = null;

let direccionSeleccionadaNombre = null;

// ============================================
// ⭐ FUNCIÓN AUXILIAR: FETCH AUTENTICADO AL WORKER
// ============================================
async function fetchAutenticado(url, opciones = {}) {
    const token = sessionStorage.getItem('sessionToken');
    
    if (!token) {
        console.error('❌ No hay token de sesión. Redirigiendo a login...');
        sessionStorage.clear();
        window.location.href = 'login.html';
        throw new Error('No hay token de sesión');
    }
    
    const headers = {
        ...(opciones.headers || {}),
        'Authorization': `Bearer ${token}`
    };
    
    const response = await fetch(url, {
        ...opciones,
        headers: headers
    });
    
    if (response.status === 401) {
        console.error('❌ Sesión inválida o expirada. Redirigiendo a login...');
        sessionStorage.clear();
        window.location.href = 'login.html';
        throw new Error('Sesión inválida');
    }
    
    return response;
}

// ============================================
// FUNCIÓN PARA PARSEAR FECHAS CORRECTAMENTE
// ============================================

function parseFechaGoogleSheets(fechaStr) {
    if (!fechaStr) return null;
    
    if (typeof fechaStr === 'object' && fechaStr !== null) {
        if (typeof fechaStr.getTime === 'function') {
            try {
                const time = fechaStr.getTime();
                if (!isNaN(time)) {
                    const fecha = new Date(time);
                    if (!isNaN(fecha.getTime())) {
                        return fecha;
                    }
                }
            } catch (e) {}
        }
        if (fechaStr instanceof Date && !isNaN(fechaStr.getTime())) {
            return fechaStr;
        }
    }
    
    if (typeof fechaStr === 'number') {
        const fecha = new Date(fechaStr);
        if (!isNaN(fecha.getTime())) {
            return fecha;
        }
        return null;
    }
    
    const fechaString = String(fechaStr).trim();
    if (!fechaString) return null;
    
    const regex = /^(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2}):(\d{2})$/;
    const match = fechaString.match(regex);
    
    if (match) {
        const dia = parseInt(match[1]);
        const mes = parseInt(match[2]) - 1;
        const anio = parseInt(match[3]);
        const hora = parseInt(match[4]);
        const minuto = parseInt(match[5]);
        const segundo = parseInt(match[6]);
        
        const fecha = new Date(anio, mes, dia, hora, minuto, segundo);
        if (!isNaN(fecha.getTime())) {
            return fecha;
        }
    }
    
    const regexFecha = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const matchFecha = fechaString.match(regexFecha);
    if (matchFecha) {
        const dia = parseInt(matchFecha[1]);
        const mes = parseInt(matchFecha[2]) - 1;
        const anio = parseInt(matchFecha[3]);
        const fecha = new Date(anio, mes, dia);
        if (!isNaN(fecha.getTime())) {
            return fecha;
        }
    }
    
    const fecha = new Date(fechaString);
    if (!isNaN(fecha.getTime())) {
        return fecha;
    }
    
    const fechaISO = new Date(fechaString.replace(/\//g, '-'));
    if (!isNaN(fechaISO.getTime())) {
        return fechaISO;
    }
    
    const timestamp = parseFloat(fechaString);
    if (!isNaN(timestamp)) {
        const fechaTimestamp = new Date(timestamp);
        if (!isNaN(fechaTimestamp.getTime())) {
            return fechaTimestamp;
        }
    }
    
    if (fechaString.includes('Date(')) {
        try {
            const matchDate = fechaString.match(/Date\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/);
            if (matchDate) {
                const anio = parseInt(matchDate[1]);
                const mes = parseInt(matchDate[2]);
                const dia = parseInt(matchDate[3]);
                const hora = parseInt(matchDate[4]) || 0;
                const minuto = parseInt(matchDate[5]) || 0;
                const segundo = parseInt(matchDate[6]) || 0;
                const fecha = new Date(anio, mes, dia, hora, minuto, segundo);
                if (!isNaN(fecha.getTime())) {
                    return fecha;
                }
            }
        } catch (e) {}
    }
    
    console.warn('⚠️ No se pudo parsear la fecha:', fechaStr);
    return null;
}

function formatearFecha(fechaStr) {
    const fecha = parseFechaGoogleSheets(fechaStr);
    if (!fecha) return 'Fecha no disponible';
    if (fecha instanceof Date && !isNaN(fecha.getTime())) {
        return fecha.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }
    return 'Fecha no disponible';
}

function formatearFechaCompleta(fechaStr) {
    const fecha = parseFechaGoogleSheets(fechaStr);
    if (!fecha) return 'Fecha no disponible';
    if (fecha instanceof Date && !isNaN(fecha.getTime())) {
        return fecha.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    }
    return 'Fecha no disponible';
}

function formatearFechaHora(fechaStr) {
    const fecha = parseFechaGoogleSheets(fechaStr);
    if (!fecha) return 'Fecha no disponible';
    if (fecha instanceof Date && !isNaN(fecha.getTime())) {
        return fecha.toLocaleString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    return 'Fecha no disponible';
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Iniciando dashboard...');
    
    if (sessionStorage.getItem('userLoggedIn') !== 'true') {
        window.location.href = 'login.html';
        return;
    }

    if (!sessionStorage.getItem('sessionToken')) {
        console.error('❌ No hay token de sesión. Redirigiendo a login...');
        sessionStorage.clear();
        window.location.href = 'login.html';
        return;
    }

    const email = sessionStorage.getItem('userEmail');
    console.log('📧 Email del cliente:', email);
    
    await cargarDatosCliente(email);
    await cargarProductos();
    await cargarPreciosEspeciales();
    await cargarDireccionesCliente();
    await cargarFacturacionCliente();
    await cargarHistorialCompras();
    
    configurarTabs();
    
    if (clienteData) {
        document.getElementById('welcomeName').textContent = clienteData.nombre;
    }
    
    console.log('✅ Dashboard inicializado correctamente');
});
// ============================================
// FUNCIONES PARA APPS SCRIPT (CON NO-CORS)
// ============================================

async function guardarFilaGoogleSheets(sheetName, datos) {
    try {
        console.log('📝 guardarFilaGoogleSheets - SheetName:', sheetName);
        console.log('📝 guardarFilaGoogleSheets - Datos:', datos);
        
        const body = {
            action: 'guardarFila',
            sheetName: sheetName,
            datos: datos
        };
        
        const response = await fetchAutenticado(`${WORKER_URL}/ventas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(body)
        });
        
        const result = await response.json();
        console.log(`✅ Respuesta del Worker para ${sheetName}:`, result);
        return result;
        
    } catch (error) {
        console.error(`❌ Error al guardar fila en ${sheetName}:`, error);
        return { success: false, error: error.toString() };
    }
}

async function agregarDireccionEnSheets(direccion) {
    try {
        console.log('📝 Enviando a Worker DIRECCIONES - AGREGAR:', direccion);
        
        const response = await fetchAutenticado(`${WORKER_URL}/direcciones`, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'agregar',
                codigo: direccion.codigo,
                nombre: direccion.nombre,
                calle: direccion.calle,
                colonia: direccion.colonia,
                alcaldia: direccion.alcaldia,
                estado: direccion.estado,
                cp: direccion.cp,
                mapsUrl: direccion.mapsUrl || '',
                telefono: direccion.telefono,
                nombreRecibe: direccion.nombreRecibe
            })
        });
        
        const result = await response.json();
        console.log('✅ Respuesta del Worker (AGREGAR):', result);
        return result;
        
    } catch (error) {
        console.error('Error al agregar dirección:', error);
        return { success: false, error: error.toString() };
    }
}

async function actualizarDireccionEnSheets(fila, datos) {
    try {
        const filaEnviar = fila;
        console.log('📝 Enviando a Worker DIRECCIONES - ACTUALIZAR - Fila:', filaEnviar);
        console.log('📝 Datos:', datos);
        
        const body = {
            action: 'actualizar',
            fila: filaEnviar,
            codigo: datos.codigo || sessionStorage.getItem('codigoCliente'),
            nombre: datos.nombre,
            calle: datos.calle,
            colonia: datos.colonia,
            alcaldia: datos.alcaldia,
            estado: datos.estado,
            cp: datos.cp,
            mapsUrl: datos.mapsUrl || '',
            telefono: datos.telefono,
            nombreRecibe: datos.nombreRecibe,
            timestamp: Date.now()
        };
        
        const response = await fetchAutenticado(`${WORKER_URL}/direcciones`, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(body)
        });
        
        const result = await response.json();
        console.log('✅ Respuesta del Worker (ACTUALIZAR):', result);
        return result;
        
    } catch (error) {
        console.error('Error al actualizar dirección:', error);
        return { success: false, error: error.toString() };
    }
}

async function eliminarDireccionEnSheets(fila) {
    try {
        const filaEnviar = fila;
        console.log('🗑️ Enviando a Worker DIRECCIONES - ELIMINAR - Fila:', filaEnviar);
        
        const body = {
            action: 'eliminar',
            fila: filaEnviar,
            timestamp: Date.now()
        };
        
        const response = await fetchAutenticado(`${WORKER_URL}/direcciones`, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(body)
        });
        
        const result = await response.json();
        console.log('✅ Respuesta del Worker (ELIMINAR):', result);
        return result;
        
    } catch (error) {
        console.error('Error al eliminar dirección:', error);
        return { success: false, error: error.toString() };
    }
}

// ============================================
// FUNCIONES DE FACTURACIÓN
// ============================================

async function cargarFacturacionCliente() {
    try {
        const codigoCliente = sessionStorage.getItem('codigoCliente');
        if (!codigoCliente) {
            console.warn('⚠️ No hay código de cliente disponible');
            return;
        }
        
        console.log('📥 Cargando datos de facturación para cliente:', codigoCliente);
        
        const url = `${WORKER_URL}/facturacion`;
        console.log('📥 URL del Worker:', url);
        
        const response = await fetchAutenticado(url);
        const text = await response.text();
        
        console.log('📥 Respuesta recibida, longitud:', text.length);
        
        if (text.includes('<!DOCTYPE html>') || text.includes('Sign in')) {
            console.error('❌ El Apps Script no está accesible.');
            facturacionCliente = [];
            renderizarFacturacion();
            return;
        }
        
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('❌ Error al parsear JSON:', e);
            facturacionCliente = [];
            renderizarFacturacion();
            return;
        }
        
        if (!data.success || !data.data) {
            console.error('❌ El Apps Script devolvió un error:', data.error || 'Sin datos');
            facturacionCliente = [];
            renderizarFacturacion();
            return;
        }
        
        console.log(`📊 Datos recibidos: ${data.data.length} registros`);
        
        facturacionCliente = [];
        
        for (const row of data.data) {
            const codigo = String(row.ID || row.id || '').trim();
            if (codigo === codigoCliente) {
                const nombre = String(row.Nombre || row.nombre || 'Sin nombre').trim();
                console.log(`✅ Facturación encontrada: "${nombre}"`);
                
                facturacionCliente.push({
                    fila: data.data.indexOf(row) + 2,
                    codigo: codigo,
                    nombre: nombre,
                    razonSocial: String(row['Razón Social'] || row['Razon Social'] || row['RazónSocial'] || row['razonSocial'] || '').trim(),
                    rfc: String(row.RFC || row.rfc || '').trim(),
                    usoCFDI: String(row['Uso de CFDI'] || row['Uso CFDI'] || row['UsoCFDI'] || row['usoCFDI'] || '').trim(),
                    cp: String(row['C.P.'] || row['CP'] || row['C.P'] || row['cp'] || '').trim(),
                    regimen: String(row['Régimen Fiscal'] || row['Regimen Fiscal'] || row['RegimenFiscal'] || row['regimen'] || '').trim(),
                    correo: String(row.Correo || row.correo || '').trim()
                });
            }
        }
        
        console.log(`📦 Datos de facturación cargados: ${facturacionCliente.length}`);
        renderizarFacturacion();
        actualizarSelectorFacturacion();
        
    } catch (error) {
        console.error('❌ Error al cargar facturación:', error);
        facturacionCliente = [];
        renderizarFacturacion();
    }
}

function renderizarFacturacion() {
    const container = document.getElementById('facturacionContent');
    if (!container) return;
    
    if (facturacionCliente.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-invoice"></i>
                <h4>Sin datos de facturación registrados</h4>
                <p>Agrega tus datos de facturación para poder facturar tus compras.</p>
                <button class="btn-primary" style="margin-top:1rem;padding:0.8rem 2rem;" onclick="abrirModalAgregarFacturacion()">
                    <i class="fas fa-plus"></i> Agregar datos de facturación
                </button>
            </div>
        `;
        return;
    }
    
    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:0.5rem;">
            <h3 style="margin:0; color:var(--primary-dark);">Tus datos de facturación</h3>
            <button class="btn-primary" onclick="abrirModalAgregarFacturacion()" style="padding:0.6rem 1.5rem; font-size:0.9rem;">
                <i class="fas fa-plus"></i> Agregar nuevo
            </button>
        </div>
        <div class="facturacion-grid">
    `;
    
    facturacionCliente.forEach((fact, index) => {
        html += `
            <div class="facturacion-card" id="fact-card-${index}">
                <div class="facturacion-header">
                    <h4><i class="fas fa-file-invoice"></i> ${fact.nombre || 'Sin nombre'}</h4>
                    <div class="facturacion-actions">
                        <button class="btn-editar" onclick="editarFacturacion(${index})">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn-eliminar" onclick="eliminarFacturacion(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="facturacion-body">
                    <p><strong>Razón Social:</strong> ${fact.razonSocial || '---'}</p>
                    <p><strong>RFC:</strong> ${fact.rfc || '---'}</p>
                    <p><strong>Uso de CFDI:</strong> ${fact.usoCFDI || '---'}</p>
                    <p><strong>Código Postal:</strong> ${fact.cp || '---'}</p>
                    <p><strong>Régimen Fiscal:</strong> ${fact.regimen || '---'}</p>
                    <p><strong>Correo:</strong> ${fact.correo || '---'}</p>
                </div>
            </div>
        `;
    });
    html += `</div>`;
    container.innerHTML = html;
}

function actualizarSelectorFacturacion() {
    const select = document.getElementById('facturaRazonSocialSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Selecciona una razón social --</option>';
    facturacionCliente.forEach((fact, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = fact.razonSocial || fact.nombre || `Facturación ${index + 1}`;
        select.appendChild(option);
    });
    select.value = '';
}

function cargarDatosFacturaSeleccionados() {
    const select = document.getElementById('facturaRazonSocialSelect');
    const index = parseInt(select.value);
    
    if (isNaN(index) || index < 0 || index >= facturacionCliente.length) {
        document.getElementById('facturaDatosPreview').style.display = 'none';
        datosFacturaSeleccionados = null;
        return;
    }
    
    const fact = facturacionCliente[index];
    datosFacturaSeleccionados = fact;
    
    document.getElementById('facturaPreviewRFC').textContent = fact.rfc || '---';
    document.getElementById('facturaPreviewUso').textContent = fact.usoCFDI || '---';
    document.getElementById('facturaPreviewCP').textContent = fact.cp || '---';
    document.getElementById('facturaPreviewRegimen').textContent = fact.regimen || '---';
    document.getElementById('facturaPreviewCorreo').textContent = fact.correo || '---';
    
    document.getElementById('facturaDatosPreview').style.display = 'block';
}

function seleccionarFactura(opcion) {
    requiereFactura = (opcion === 'si');
    
    document.getElementById('facturaNo').classList.remove('selected');
    document.getElementById('facturaSi').classList.remove('selected');
    
    if (opcion === 'no') {
        document.getElementById('facturaNo').classList.add('selected');
        document.getElementById('facturaRazonSocialContainer').style.display = 'none';
        document.getElementById('facturaDatosPreview').style.display = 'none';
        datosFacturaSeleccionados = null;
    } else {
        document.getElementById('facturaSi').classList.add('selected');
        document.getElementById('facturaRazonSocialContainer').style.display = 'block';
        actualizarSelectorFacturacion();
    }
}

// ============================================
// EDITAR FACTURACIÓN
// ============================================

function editarFacturacion(index) {
    const fact = facturacionCliente[index];
    if (!fact) {
        console.error('❌ Datos de facturación no encontrados en índice:', index);
        mostrarNotificacion('❌ Error: No se encontraron los datos de facturación.');
        return;
    }
    
    console.log('✏️ EDITANDO FACTURACIÓN - Nombre:', fact.nombre);
    console.log('✏️ EDITANDO FACTURACIÓN - Fila REAL:', fact.fila);
    
    document.getElementById('editFactIndex').value = index;
    document.getElementById('editFactFila').value = fact.fila;
    document.getElementById('editFactRazonSocial').value = fact.razonSocial || '';
    document.getElementById('editFactRFC').value = fact.rfc || '';
    document.getElementById('editFactUsoCFDI').value = fact.usoCFDI || '';
    document.getElementById('editFactCP').value = fact.cp || '';
    document.getElementById('editFactRegimen').value = fact.regimen || '';
    document.getElementById('editFactCorreo').value = fact.correo || '';
    
    document.getElementById('modalEditarFacturacion').classList.add('active');
}

function cerrarModalEditarFacturacion() {
    document.getElementById('modalEditarFacturacion').classList.remove('active');
}

async function guardarEdicionFacturacion() {
    const index = parseInt(document.getElementById('editFactIndex').value);
    const fact = facturacionCliente[index];
    if (!fact) {
        mostrarNotificacion('❌ Error: No se encontraron los datos de facturación a editar.');
        return;
    }
    
    const fila = parseInt(document.getElementById('editFactFila').value);
    console.log('💾 GUARDANDO FACTURACIÓN - Nombre:', fact.nombre);
    console.log('💾 GUARDANDO FACTURACIÓN - Fila REAL a actualizar:', fila);
    
    const datosActualizados = {
        codigo: fact.codigo,
        nombre: fact.nombre,
        razonSocial: document.getElementById('editFactRazonSocial').value.trim(),
        rfc: document.getElementById('editFactRFC').value.trim(),
        usoCFDI: document.getElementById('editFactUsoCFDI').value.trim(),
        cp: document.getElementById('editFactCP').value.trim(),
        regimen: document.getElementById('editFactRegimen').value.trim(),
        correo: document.getElementById('editFactCorreo').value.trim()
    };
    
    if (!datosActualizados.razonSocial || !datosActualizados.rfc || !datosActualizados.usoCFDI || 
        !datosActualizados.cp || !datosActualizados.regimen || !datosActualizados.correo) {
        mostrarNotificacion('⚠️ Todos los campos son obligatorios.');
        return;
    }
    
    const btn = document.querySelector('#modalEditarFacturacion .btn-enviar');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Guardando...';
    
    try {
        console.log('📝 Enviando a Worker - ACTUALIZAR FACTURACIÓN');
        console.log('📝 Datos:', datosActualizados);
        console.log('📝 Fila:', fila);
        
        const response = await fetchAutenticado(`${WORKER_URL}/facturacion`, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'actualizarFacturacion',
                fila: fila,
                codigo: fact.codigo,
                nombre: fact.nombre,
                razonSocial: datosActualizados.razonSocial,
                rfc: datosActualizados.rfc,
                usoCFDI: datosActualizados.usoCFDI,
                cp: datosActualizados.cp,
                regimen: datosActualizados.regimen,
                correo: datosActualizados.correo
            })
        });
        
        const result = await response.json();
        console.log('✅ Respuesta del Worker (ACTUALIZAR FACTURACIÓN):', result);
        
        facturacionCliente[index] = { ...fact, ...datosActualizados, fila: fila };
        renderizarFacturacion();
        actualizarSelectorFacturacion();
        cerrarModalEditarFacturacion();
        mostrarNotificacion('✅ Datos de facturación actualizados correctamente');
        
        setTimeout(() => cargarFacturacionCliente(), 1500);
        
    } catch (error) {
        console.error('❌ Error al actualizar facturación:', error);
        mostrarNotificacion('❌ Error al guardar los cambios. Intenta de nuevo.');
    }
    
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
}

// ============================================
// ELIMINAR FACTURACIÓN
// ============================================

async function eliminarFacturacion(index) {
    const fact = facturacionCliente[index];
    if (!fact) {
        console.error('❌ Datos de facturación no encontrados en índice:', index);
        return;
    }
    
    console.log('🗑️ ELIMINANDO FACTURACIÓN - Nombre:', fact.nombre);
    console.log('🗑️ ELIMINANDO FACTURACIÓN - Fila REAL:', fact.fila);
    
    if (!confirm(`¿Seguro que quieres eliminar los datos de facturación de "${fact.nombre}"?`)) return;
    
    try {
        console.log('🗑️ Enviando a Worker - ELIMINAR FACTURACIÓN');
        console.log('🗑️ Fila:', fact.fila);
        
        const response = await fetchAutenticado(`${WORKER_URL}/facturacion`, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'eliminarFacturacion',
                fila: fact.fila
            })
        });
        const result = await response.json();
        console.log('✅ Respuesta del Worker (ELIMINAR FACTURACIÓN):', result);
        
        facturacionCliente.splice(index, 1);
        renderizarFacturacion();
        actualizarSelectorFacturacion();
        mostrarNotificacion('🗑️ Datos de facturación eliminados correctamente');
        
        setTimeout(() => cargarFacturacionCliente(), 1500);
        
    } catch (error) {
        console.error('❌ Error al eliminar facturación:', error);
        mostrarNotificacion('❌ Error al eliminar los datos de facturación.');
    }
}

// ============================================
// AGREGAR FACTURACIÓN (DESDE LA PESTAÑA)
// ============================================

function abrirModalAgregarFacturacion() {
    document.getElementById('modalAgregarFacturacion').classList.add('active');
    
    document.getElementById('agregarFactNombre').value = clienteData ? clienteData.nombre : '';
    document.getElementById('agregarFactRazonSocial').value = '';
    document.getElementById('agregarFactRFC').value = '';
    document.getElementById('agregarFactUsoCFDI').value = '';
    document.getElementById('agregarFactCP').value = '';
    document.getElementById('agregarFactRegimen').value = '';
    document.getElementById('agregarFactCorreo').value = clienteData ? clienteData.correo : '';
    document.getElementById('modalAgregarFactMensaje').style.display = 'none';
}

function cerrarModalAgregarFacturacion() {
    document.getElementById('modalAgregarFacturacion').classList.remove('active');
}

async function guardarNuevaFacturacion() {
    const codigoCliente = sessionStorage.getItem('codigoCliente');
    if (!codigoCliente) {
        mostrarNotificacion('⚠️ Error: No se pudo identificar al cliente.');
        return;
    }
    
    const datos = {
        codigo: codigoCliente,
        nombre: document.getElementById('agregarFactNombre').value.trim(),
        razonSocial: document.getElementById('agregarFactRazonSocial').value.trim(),
        rfc: document.getElementById('agregarFactRFC').value.trim(),
        usoCFDI: document.getElementById('agregarFactUsoCFDI').value.trim(),
        cp: document.getElementById('agregarFactCP').value.trim(),
        regimen: document.getElementById('agregarFactRegimen').value.trim(),
        correo: document.getElementById('agregarFactCorreo').value.trim()
    };
    
    if (!datos.razonSocial || !datos.rfc || !datos.usoCFDI || !datos.cp || !datos.regimen || !datos.correo) {
        mostrarMensajeModalAgregar('error', '⚠️ Todos los campos son obligatorios.');
        return;
    }
    
    const btn = document.querySelector('#modalAgregarFacturacion .btn-enviar');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Guardando...';
    
    try {
        console.log('📝 Enviando a Worker - AGREGAR FACTURACIÓN');
        console.log('📝 Datos:', datos);
        
        const response = await fetchAutenticado(`${WORKER_URL}/facturacion`, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'agregarFacturacion',
                codigo: datos.codigo,
                nombre: datos.nombre,
                razonSocial: datos.razonSocial,
                rfc: datos.rfc,
                usoCFDI: datos.usoCFDI,
                cp: datos.cp,
                regimen: datos.regimen,
                correo: datos.correo
            })
        });
        const result = await response.json();
        console.log('✅ Respuesta del Worker (AGREGAR FACTURACIÓN):', result);
        
        cerrarModalAgregarFacturacion();
        mostrarNotificacion('✅ Datos de facturación agregados correctamente');
        
        setTimeout(() => cargarFacturacionCliente(), 1500);
        
    } catch (error) {
        console.error('❌ Error al agregar facturación:', error);
        mostrarMensajeModalAgregar('error', '❌ Error al guardar los datos. Intenta de nuevo.');
    }
    
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Guardar';
}

function mostrarMensajeModalAgregar(tipo, mensaje) {
    const div = document.getElementById('modalAgregarFactMensaje');
    div.className = tipo === 'exito' ? 'mensaje-exito' : 'mensaje-error';
    div.innerHTML = mensaje;
    div.style.display = 'block';
}

// ============================================
// AGREGAR FACTURACIÓN (DESDE EL MODAL DE PAGO)
// ============================================

function abrirModalAgregarFacturacionDesdePago() {
    document.getElementById('modalAgregarFacturacionPago').classList.add('active');
    
    document.getElementById('agregarFactPagoNombre').value = clienteData ? clienteData.nombre : '';
    document.getElementById('agregarFactPagoRazonSocial').value = '';
    document.getElementById('agregarFactPagoRFC').value = '';
    document.getElementById('agregarFactPagoUsoCFDI').value = '';
    document.getElementById('agregarFactPagoCP').value = '';
    document.getElementById('agregarFactPagoRegimen').value = '';
    document.getElementById('agregarFactPagoCorreo').value = clienteData ? clienteData.correo : '';
    document.getElementById('modalAgregarFactPagoMensaje').style.display = 'none';
}

function cerrarModalAgregarFacturacionPago() {
    document.getElementById('modalAgregarFacturacionPago').classList.remove('active');
}

async function guardarNuevaFacturacionDesdePago() {
    const codigoCliente = sessionStorage.getItem('codigoCliente');
    if (!codigoCliente) {
        mostrarNotificacion('⚠️ Error: No se pudo identificar al cliente.');
        return;
    }
    
    const datos = {
        codigo: codigoCliente,
        nombre: document.getElementById('agregarFactPagoNombre').value.trim(),
        razonSocial: document.getElementById('agregarFactPagoRazonSocial').value.trim(),
        rfc: document.getElementById('agregarFactPagoRFC').value.trim(),
        usoCFDI: document.getElementById('agregarFactPagoUsoCFDI').value.trim(),
        cp: document.getElementById('agregarFactPagoCP').value.trim(),
        regimen: document.getElementById('agregarFactPagoRegimen').value.trim(),
        correo: document.getElementById('agregarFactPagoCorreo').value.trim()
    };
    
    if (!datos.razonSocial || !datos.rfc || !datos.usoCFDI || !datos.cp || !datos.regimen || !datos.correo) {
        mostrarMensajeModalAgregarPago('error', '⚠️ Todos los campos son obligatorios.');
        return;
    }
    
    const btn = document.querySelector('#modalAgregarFacturacionPago .btn-enviar');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Guardando...';
    
    try {
        console.log('📝 Enviando a Worker - AGREGAR FACTURACIÓN (desde pago)');
        console.log('📝 Datos:', datos);
        
        const response = await fetchAutenticado(`${WORKER_URL}/facturacion`, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'agregarFacturacion',
                codigo: datos.codigo,
                nombre: datos.nombre,
                razonSocial: datos.razonSocial,
                rfc: datos.rfc,
                usoCFDI: datos.usoCFDI,
                cp: datos.cp,
                regimen: datos.regimen,
                correo: datos.correo
            })
        });
        const result = await response.json();
        console.log('✅ Respuesta del Worker (AGREGAR FACTURACIÓN):', result);
        
        cerrarModalAgregarFacturacionPago();
        mostrarNotificacion('✅ Datos de facturación agregados correctamente');
        
        setTimeout(() => {
            cargarFacturacionCliente();
            setTimeout(() => actualizarSelectorFacturacion(), 500);
        }, 1500);
        
    } catch (error) {
        console.error('❌ Error al agregar facturación:', error);
        mostrarMensajeModalAgregarPago('error', '❌ Error al guardar los datos. Intenta de nuevo.');
    }
    
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Guardar';
}

function mostrarMensajeModalAgregarPago(tipo, mensaje) {
    const div = document.getElementById('modalAgregarFactPagoMensaje');
    div.className = tipo === 'exito' ? 'mensaje-exito' : 'mensaje-error';
    div.innerHTML = mensaje;
    div.style.display = 'block';
}

// ============================================
// CARGA DE DATOS DEL CLIENTE (Fase 0.1)
// ============================================
async function cargarDatosCliente(email) {
    try {
        const url = `${WORKER_URL}/leer?tipo=clientes`;
        const response = await fetchAutenticado(url);
        
        // La respuesta ahora es un JSON simple: { success: true, cliente: {...} }
        const data = await response.json();
        
        if (!data.success || !data.cliente) {
            console.error('❌ No se pudieron cargar los datos del cliente:', data.error);
            return;
        }
        
        const cliente = data.cliente;
        
        // Parsear los valores numéricos y booleanos
        const creditoHabilitadoRaw = String(cliente.creditoHabilitado || '').trim().toUpperCase();
        const creditoHabilitado = creditoHabilitadoRaw === 'SI' || creditoHabilitadoRaw === 'TRUE' || creditoHabilitadoRaw === 'VERDADERO';
        
        clienteData = {
            codigo: String(cliente.codigo || '').trim(),
            nombre: String(cliente.nombre || '').trim(),
            giro: String(cliente.giro || '').trim(),
            correo: String(cliente.correo || '').trim(),
            telefono: String(cliente.telefono || '').trim(),
            descuento: parseFloat(cliente.descuento) || 0,
            noCompras: parseInt(cliente.noCompras) || 0,
            montoCompras: parseFloat(cliente.montoCompras) || 0,
            creditoPendiente: parseFloat(cliente.creditoPendiente) || 0,
            creditoLiquidado: parseFloat(cliente.creditoLiquidado) || 0,
            sucursal: String(cliente.sucursal || '').trim(),
            fechaRegistro: String(cliente.fechaRegistro || '').trim(),
            creditoHabilitado: creditoHabilitado,
            limiteCreditoPeso: parseFloat(cliente.limiteCreditoPeso) || 0,
            limiteCreditoMonto: parseFloat(cliente.limiteCreditoMonto) || 0
        };
        
        clienteCreditoHabilitado = clienteData.creditoHabilitado;
        clienteLimiteCreditoPeso = clienteData.limiteCreditoPeso;
        clienteLimiteCreditoMonto = clienteData.limiteCreditoMonto;
        
        console.log('💳 CRÉDITO HABILITADO:', clienteCreditoHabilitado);
        console.log('⚖️ LÍMITE CRÉDITO PESO:', clienteLimiteCreditoPeso, 'kg');
        console.log('💰 LÍMITE CRÉDITO MONTO:', clienteLimiteCreditoMonto);
        console.log('📊 DESCUENTO BASE DEL CLIENTE:', clienteData.descuento + '%');
        console.log('📊 GIRO DEL CLIENTE:', clienteData.giro);
        
        if (clienteData) {
            actualizarInfoCliente();
        } else {
            console.error('❌ Cliente no encontrado');
        }
        
    } catch (error) {
        console.error('❌ Error al cargar datos del cliente:', error);
    }
}

function actualizarInfoCliente() {
    if (!clienteData) return;
    
    document.getElementById('userNameDisplay').textContent = clienteData.nombre;
    document.getElementById('userEmailDisplay').textContent = clienteData.correo;
    document.getElementById('welcomeName').textContent = clienteData.nombre;
    document.getElementById('clienteCodigo').textContent = clienteData.codigo;
    document.getElementById('clienteDescuento').textContent = clienteData.descuento + '%';
}

// ============================================
// CARGA DE PRODUCTOS
// ============================================

async function cargarProductos() {
    try {
        console.log('📥 Cargando productos desde Google Sheets...');
        const url = `${WORKER_URL}/leer?tipo=productos`;
        const response = await fetchAutenticado(url);
        const text = await response.text();
        const jsonStr = text.substring(text.indexOf('(') + 1, text.lastIndexOf(')'));
        const data = JSON.parse(jsonStr);
        const rows = data.table.rows;
        
        console.log(`📊 Total de filas en la hoja: ${rows.length}`);
        console.log(`📌 La fila 0 es el encabezado. Los datos comienzan desde la fila 1.`);
        
        productosGlobales = [];
        let contadorConPeso = 0;
        let filasProcesadas = 0;
        let filasSaltadas = 0;
        
        for (let i = 0; i < rows.length; i++) {
            const values = rows[i].c.map(cell => cell ? cell.v : '');
            
            const clave = String(values[0] || '').trim();
            const nombre = String(values[1] || '').trim();
            
            if (!clave || !nombre || 
                clave.toLowerCase() === 'clave' || 
                clave.toLowerCase() === 'id' || 
                clave.toLowerCase() === 'código' ||
                clave.toLowerCase() === 'codigo' ||
                clave.toLowerCase() === 'sku' ||
                clave.toLowerCase() === 'producto' ||
                isNaN(parseFloat(clave))) {
                filasSaltadas++;
                continue;
            }
            
            filasProcesadas++;
            
            const descripcion = String(values[2] || '').trim();
            const precio = parseFloat(values[3]) || 0;
            const na = String(values[4] || '').trim();
            const precioCompra = parseFloat(values[5]) || 0;
            const descuentoPublico = parseFloat(values[9]) || 0;
            const descuentoTrabajador = parseFloat(values[10]) || 0;
            const descuentoArquitecto = parseFloat(values[11]) || 0;
            const descuentoConstructora = parseFloat(values[12]) || 0;
            const descuentoDistribuidor = parseFloat(values[13]) || 0;
            const pxv = String(values[14] || '').trim();
            const descuentoVolumenP = parseFloat(values[15]) || 0;
            const descuentoVolumenQ = parseFloat(values[16]) || 0;
            
            const pesoCondicionRaw = String(values[17] || '').trim().toUpperCase();
            const pesoCondicion = pesoCondicionRaw === 'SI' ? 'SI' : 'NO';
            
            const pesoRaw = String(values[18] || '').trim();
            const peso = parseFloat(pesoRaw) || 0;
            
            const minPiezasCondicion = String(values[19] || '').trim().toUpperCase();
            const minPiezas = parseFloat(values[20]) || 0;
            const permitidoCondicion = String(values[21] || '').trim().toUpperCase();
            
            const requiereMinPiezas = minPiezasCondicion === 'SI';
            const permitido = permitidoCondicion === 'SI';
            
            productosGlobales.push({
                clave: clave,
                nombre: nombre,
                descripcion: descripcion,
                precio: precio,
                na: na,
                precioCompra: precioCompra,
                descuentoPublico: descuentoPublico,
                descuentoTrabajador: descuentoTrabajador,
                descuentoArquitecto: descuentoArquitecto,
                descuentoConstructora: descuentoConstructora,
                descuentoDistribuidor: descuentoDistribuidor,
                pxv: pxv,
                descuentoVolumenP: descuentoVolumenP,
                descuentoVolumenQ: descuentoVolumenQ,
                pesoCondicion: pesoCondicion,
                peso: peso,
                requiereMinPiezas: requiereMinPiezas,
                minPiezas: minPiezas,
                permitido: permitido,
                fila: i + 1
            });
        }
        
        console.log(`📦 Productos cargados: ${productosGlobales.length}`);
        console.log(`📊 Filas procesadas: ${filasProcesadas}, Filas saltadas: ${filasSaltadas}`);
        
    } catch (error) {
        console.error('❌ Error al cargar productos:', error);
    }
}

// ============================================
// CARGA DE PRECIOS ESPECIALES (Fase 0.4)
// ============================================
async function cargarPreciosEspeciales() {
    try {
        console.log('💰 Cargando precios especiales del cliente autenticado...');
        
        const url = `${WORKER_URL}/leer?tipo=precios-especiales`;
        const response = await fetchAutenticado(url);
        
        // La respuesta ahora es un JSON simple: { success: true, precios: [...] }
        const data = await response.json();
        
        if (!data.success) {
            console.error('❌ No se pudieron cargar los precios especiales:', data.error);
            preciosEspecialesGlobales = [];
            return;
        }
        
        preciosEspecialesGlobales = (data.precios || []).map(p => ({
            id: String(p.id || '').trim(),
            codigoCliente: String(p.codigoCliente || '').trim(),
            nombreCliente: String(p.nombreCliente || '').trim(),
            claveProducto: String(p.claveProducto || '').trim(),
            nombreProducto: String(p.nombreProducto || '').trim(),
            precioPersonalizado: parseFloat(p.precioPersonalizado) || 0,
            fechaRegistro: String(p.fechaRegistro || '').trim()
        }));
        
        console.log(`💰 Precios especiales cargados: ${preciosEspecialesGlobales.length}`);
        
    } catch (error) {
        console.error('❌ Error al cargar precios especiales:', error);
        preciosEspecialesGlobales = [];
    }
}

// ============================================
// CARGA DE DIRECCIONES DEL CLIENTE (Fase 0.2)
// ============================================
async function cargarDireccionesCliente() {
    try {
        console.log('📥 Cargando direcciones del cliente autenticado...');
        
        const url = `${WORKER_URL}/leer?tipo=direcciones`;
        const response = await fetchAutenticado(url);
        
        // La respuesta ahora es un JSON simple: { success: true, direcciones: [...] }
        const data = await response.json();
        
        if (!data.success) {
            console.error('❌ No se pudieron cargar las direcciones:', data.error);
            direccionesCliente = [];
            renderizarDirecciones();
            actualizarSelectorDirecciones();
            return;
        }
        
        // Mapear las direcciones al formato que usa el frontend
        direccionesCliente = (data.direcciones || []).map(d => ({
            fila: d.fila,
            codigo: String(d.codigo || '').trim(),
            nombre: String(d.nombre || '').trim() || 'Sin nombre',
            calle: String(d.calle || '').trim(),
            colonia: String(d.colonia || '').trim(),
            alcaldia: String(d.alcaldia || '').trim(),
            estado: String(d.estado || '').trim(),
            cp: String(d.cp || '').trim(),
            mapsUrl: String(d.mapsUrl || '').trim(),
            telefono: String(d.telefono || '').trim(),
            nombreRecibe: String(d.nombreRecibe || '').trim()
        }));
        
        console.log(`📦 Direcciones cargadas: ${direccionesCliente.length}`);
        renderizarDirecciones();
        actualizarSelectorDirecciones();
        
    } catch (error) {
        console.error('❌ Error al cargar direcciones:', error);
        direccionesCliente = [];
        renderizarDirecciones();
        actualizarSelectorDirecciones();
    }
}

function renderizarDirecciones() {
    const container = document.getElementById('direccionesContent');
    if (!container) return;
    
    if (direccionesCliente.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-map-marker-alt"></i>
                <h4>Sin direcciones registradas</h4>
                <p>Agrega una dirección desde el formulario de compra.</p>
            </div>
        `;
        return;
    }
    
    let html = `<div class="direcciones-grid">`;
    direccionesCliente.forEach((dir, index) => {
        html += `
            <div class="direccion-card" id="dir-card-${index}">
                <div class="direccion-header">
                    <h4><i class="fas fa-home"></i> ${dir.nombre || 'Sin nombre'} <span style="font-size:0.7rem;color:var(--text-gray);">(Fila ${dir.fila})</span></h4>
                    <div class="direccion-actions">
                        <button class="btn-editar" onclick="editarDireccion(${index})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-eliminar" onclick="eliminarDireccion(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="direccion-body">
                    <p><strong>Calle:</strong> ${dir.calle || '---'}</p>
                    <p><strong>Colonia:</strong> ${dir.colonia || '---'}</p>
                    <p><strong>Alcaldía/Municipio:</strong> ${dir.alcaldia || '---'}</p>
                    <p><strong>Estado:</strong> ${dir.estado || '---'}</p>
                    <p><strong>Código Postal:</strong> ${dir.cp || '---'}</p>
                    ${dir.mapsUrl ? `<p><strong>Google Maps:</strong> <a href="${dir.mapsUrl}" target="_blank">Ver mapa</a></p>` : ''}
                    <p><strong>Teléfono:</strong> ${dir.telefono || '---'}</p>
                    <p><strong>Recibe:</strong> ${dir.nombreRecibe || '---'}</p>
                </div>
            </div>
        `;
    });
    html += `</div>`;
    container.innerHTML = html;
}

function actualizarSelectorDirecciones() {
    const select = document.getElementById('direccionSelector');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Selecciona una dirección guardada --</option>';
    direccionesCliente.forEach((dir, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = dir.nombre || `Dirección ${index + 1} (Fila ${dir.fila})`;
        select.appendChild(option);
    });
    select.value = '';
}

// ============================================
// EDITAR DIRECCIÓN
// ============================================

function editarDireccion(index) {
    const dir = direccionesCliente[index];
    if (!dir) {
        console.error('❌ Dirección no encontrada en índice:', index);
        return;
    }
    
    console.log('✏️ EDITANDO - Dirección:', dir.nombre);
    console.log('✏️ EDITANDO - Fila REAL:', dir.fila);
    
    document.getElementById('editDirIndex').value = index;
    document.getElementById('editDirFila').value = dir.fila;
    document.getElementById('editDirNombre').value = dir.nombre || '';
    document.getElementById('editDirCalle').value = dir.calle || '';
    document.getElementById('editDirColonia').value = dir.colonia || '';
    document.getElementById('editDirAlcaldia').value = dir.alcaldia || '';
    document.getElementById('editDirEstado').value = dir.estado || '';
    document.getElementById('editDirCP').value = dir.cp || '';
    document.getElementById('editDirMaps').value = dir.mapsUrl || '';
    document.getElementById('editDirTelefono').value = dir.telefono || '';
    document.getElementById('editDirNombreRecibe').value = dir.nombreRecibe || '';
    
    document.getElementById('modalEditarDireccion').classList.add('active');
}

function cerrarModalEditarDireccion() {
    document.getElementById('modalEditarDireccion').classList.remove('active');
}

async function guardarEdicionDireccion() {
    const index = parseInt(document.getElementById('editDirIndex').value);
    const dir = direccionesCliente[index];
    if (!dir) {
        mostrarNotificacion('❌ Error: No se encontró la dirección a editar.');
        return;
    }
    
    const fila = parseInt(document.getElementById('editDirFila').value);
    console.log('💾 GUARDANDO - Dirección:', dir.nombre);
    console.log('💾 GUARDANDO - Fila REAL a actualizar:', fila);
    
    const datosActualizados = {
        codigo: dir.codigo,
        nombre: document.getElementById('editDirNombre').value.trim(),
        calle: document.getElementById('editDirCalle').value.trim(),
        colonia: document.getElementById('editDirColonia').value.trim(),
        alcaldia: document.getElementById('editDirAlcaldia').value.trim(),
        estado: document.getElementById('editDirEstado').value.trim(),
        cp: document.getElementById('editDirCP').value.trim(),
        mapsUrl: document.getElementById('editDirMaps').value.trim(),
        telefono: document.getElementById('editDirTelefono').value.trim(),
        nombreRecibe: document.getElementById('editDirNombreRecibe').value.trim()
    };
    
    if (!datosActualizados.nombre || !datosActualizados.calle || !datosActualizados.colonia || 
        !datosActualizados.alcaldia || !datosActualizados.estado || !datosActualizados.cp || 
        !datosActualizados.telefono || !datosActualizados.nombreRecibe) {
        mostrarNotificacion('⚠️ Todos los campos son obligatorios excepto Google Maps.');
        return;
    }
    
    try {
        await actualizarDireccionEnSheets(fila, datosActualizados);
        
        direccionesCliente[index] = { ...dir, ...datosActualizados, fila: fila };
        renderizarDirecciones();
        actualizarSelectorDirecciones();
        cerrarModalEditarDireccion();
        mostrarNotificacion('✅ Dirección actualizada correctamente');
        
        setTimeout(() => cargarDireccionesCliente(), 1500);
        
    } catch (error) {
        console.error('❌ Error al actualizar dirección:', error);
        mostrarNotificacion('❌ Error al guardar los cambios. Intenta de nuevo.');
    }
}

// ============================================
// ELIMINAR DIRECCIÓN
// ============================================

async function eliminarDireccion(index) {
    const dir = direccionesCliente[index];
    if (!dir) {
        console.error('❌ Dirección no encontrada en índice:', index);
        return;
    }
    
    console.log('🗑️ ELIMINANDO - Dirección:', dir.nombre);
    console.log('🗑️ ELIMINANDO - Fila REAL:', dir.fila);
    
    if (!confirm(`¿Seguro que quieres eliminar "${dir.nombre}" (Fila ${dir.fila})?`)) return;
    
    try {
        await eliminarDireccionEnSheets(dir.fila);
        
        direccionesCliente.splice(index, 1);
        renderizarDirecciones();
        actualizarSelectorDirecciones();
        mostrarNotificacion('🗑️ Dirección eliminada correctamente');
        
        setTimeout(() => cargarDireccionesCliente(), 1500);
        
    } catch (error) {
        console.error('❌ Error al eliminar dirección:', error);
        mostrarNotificacion('❌ Error al eliminar la dirección.');
    }
}

// ============================================
// GUARDAR NUEVA DIRECCIÓN
// ============================================

async function guardarNuevaDireccion(datos) {
    try {
        const codigoCliente = sessionStorage.getItem('codigoCliente');
        if (!codigoCliente) {
            mostrarNotificacion('⚠️ Error: No se pudo identificar al cliente.');
            return false;
        }
        
        const nuevaDireccion = {
            codigo: codigoCliente,
            nombre: datos.nombre,
            calle: datos.calle,
            colonia: datos.colonia,
            alcaldia: datos.alcaldia,
            estado: datos.estado,
            cp: datos.cp,
            mapsUrl: datos.mapsUrl || '',
            telefono: datos.telefono,
            nombreRecibe: datos.nombreRecibe
        };
        
        await agregarDireccionEnSheets(nuevaDireccion);
        
        mostrarNotificacion('✅ Dirección guardada correctamente');
        await cargarDireccionesCliente();
        return true;
        
    } catch (error) {
        console.error('❌ Error al guardar dirección:', error);
        mostrarNotificacion('❌ Error al guardar la dirección');
        return false;
    }
}
// ============================================
// FUNCIONES DE BÚSQUEDA DE PRODUCTOS
// ============================================

function buscarProductos() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    const resultsDiv = document.getElementById('resultsContent');
    
    if (!query) {
        resultsDiv.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h4>Busca productos</h4>
                <p>Escribe el nombre de un producto para comenzar.</p>
            </div>
        `;
        return;
    }
    
    const resultados = productosGlobales.filter(p => 
        (p.nombre.toLowerCase().includes(query) || 
        p.clave.toLowerCase().includes(query) ||
        p.descripcion.toLowerCase().includes(query)) &&
        p.permitido
    );
    
    if (resultados.length === 0) {
        resultsDiv.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h4>No se encontraron resultados</h4>
                <p>Intenta con otra palabra o contacta a tu asesor.</p>
            </div>
        `;
        return;
    }
    
    let html = `<div class="product-grid">`;
    resultados.forEach(producto => {
        const precioFinal = obtenerPrecioFinal(producto);
        const precioMostrar = precioFinal.precio;
        
        let etiquetaPeso = '';
        if (producto.pesoCondicion === 'SI' && producto.peso > 0) {
            etiquetaPeso = `<span class="tag-peso">⚖️ ${producto.peso} kg/unidad - Mínimo 1 tonelada combinada</span>`;
        }
        
        let etiquetaMinPiezas = '';
        if (producto.requiereMinPiezas && producto.minPiezas > 0) {
            etiquetaMinPiezas = `<span class="tag-peso" style="background:#fef3c7;color:#92400e;">📦 Mínimo: ${producto.minPiezas} piezas</span>`;
        }
        
        let etiquetaPXV = '';
        if (producto.pxv === 'PXV' && producto.pesoCondicion === 'SI') {
            let infoVolumen = '';
            if (producto.descuentoVolumenP > 0 || producto.descuentoVolumenQ > 0) {
                let partes = [];
                if (producto.descuentoVolumenP > 0) partes.push(`+${producto.descuentoVolumenP}% (150 und / 3T)`);
                if (producto.descuentoVolumenQ > 0) partes.push(`+${producto.descuentoVolumenQ}% (250 und / 5T)`);
                infoVolumen = ` - ${partes.join(' | ')}`;
            }
            etiquetaPXV = `<span class="tag-pxv">📦 Descuento por Volumen${infoVolumen}</span>`;
        }
        
        html += `
            <div class="product-card">
                <span class="clave">${producto.clave}</span>
                ${producto.pxv === 'PXV' && producto.pesoCondicion === 'SI' ? etiquetaPXV : ''}
                ${etiquetaPeso}
                ${etiquetaMinPiezas}
                <h4>${producto.nombre}</h4>
                <p class="descripcion">${producto.descripcion || 'Sin descripción'}</p>
                <p class="precio">${formatoMexicano(precioMostrar)}</p>
                <button class="btn-agregar" onclick="agregarAlCarrito('${producto.clave}')">
                    <i class="fas fa-plus"></i> Agregar
                </button>
            </div>
        `;
    });
    html += `</div>`;
    resultsDiv.innerHTML = html;
}

function limpiarBusqueda() {
    document.getElementById('searchInput').value = '';
    buscarProductos();
}

// ============================================
// PRECIOS Y DESCUENTOS (CON PRECIOS ESPECIALES)
// ============================================

function obtenerPrecioFinal(producto) {
    const precioEspecial = preciosEspecialesGlobales.find(p => 
        p.codigoCliente === clienteData.codigo && 
        p.claveProducto === producto.clave
    );
    
    if (precioEspecial) {
        return {
            precio: precioEspecial.precioPersonalizado,
            personalizado: true,
            descuentoAplicado: 0
        };
    }
    
    return {
        precio: producto.precio,
        personalizado: false,
        descuentoAplicado: 0
    };
}

function calcularDescuentoProducto(producto, cantidad) {
    const precioEspecial = preciosEspecialesGlobales.find(p => 
        p.codigoCliente === clienteData.codigo && 
        p.claveProducto === producto.clave
    );
    
    if (precioEspecial) {
        return 0;
    }
    
    if (producto.na === 'N/A') {
        return 0;
    }
    
    const naNumero = parseFloat(producto.na);
    if (!isNaN(naNumero) && producto.na !== '' && producto.na !== '-' && producto.na !== 'N/A') {
        return naNumero;
    }
    
    if (producto.na === '-') {
        const giro = clienteData.giro || 'Público en general';
        
        const mapGiro = {
            'Público en general': producto.descuentoPublico,
            'Público': producto.descuentoPublico,
            'Trabajador': producto.descuentoTrabajador,
            'Arquitecto': producto.descuentoArquitecto,
            'Inmobiliaria': producto.descuentoArquitecto,
            'Constructora': producto.descuentoConstructora,
            'Distribuidor': producto.descuentoDistribuidor
        };
        
        let descuentoBase = mapGiro[giro] || 0;
        
        if (producto.pxv === 'PXV' && producto.pesoCondicion === 'SI') {
            let descuentoAdicional = 0;
            
            if (cantidad >= 250 && producto.descuentoVolumenQ > 0) {
                descuentoAdicional = producto.descuentoVolumenQ;
            } else if (cantidad >= 150 && producto.descuentoVolumenP > 0) {
                descuentoAdicional = producto.descuentoVolumenP;
            }
            
            if (descuentoAdicional > 0) {
                return descuentoBase + descuentoAdicional;
            }
        }
        return descuentoBase;
    }
    
    if (producto.na === '' || producto.na === null || producto.na === undefined) {
        let descuentoBase = clienteData.descuento || 0;
        
        if (producto.pxv === 'PXV' && producto.pesoCondicion === 'SI') {
            let descuentoAdicional = 0;
            
            if (cantidad >= 250 && producto.descuentoVolumenQ > 0) {
                descuentoAdicional = producto.descuentoVolumenQ;
            } else if (cantidad >= 150 && producto.descuentoVolumenP > 0) {
                descuentoAdicional = producto.descuentoVolumenP;
            }
            
            if (descuentoAdicional > 0) {
                return descuentoBase + descuentoAdicional;
            }
        }
        return descuentoBase;
    }
    
    return 0;
}

// ============================================
// VERIFICACIÓN DE CRÉDITO DISPONIBLE
// ============================================

function verificarCreditoDisponible() {
    console.log('🔍 Verificando crédito disponible...');
    console.log('💳 Cliente crédito habilitado:', clienteCreditoHabilitado);
    console.log('⚖️ Límite crédito peso:', clienteLimiteCreditoPeso);
    console.log('💰 Límite crédito monto:', clienteLimiteCreditoMonto);
    
    const tieneCreditosPendientes = creditosPendientes && creditosPendientes.length > 0;
    if (tieneCreditosPendientes) {
        const totalPendiente = creditosPendientes.reduce((sum, v) => sum + (v.saldoPendiente || v.total || 0), 0);
        console.log(`⚠️ Cliente tiene créditos pendientes: ${formatoMexicano(totalPendiente)}`);
        
        return {
            puedeCredito: false,
            tipo: 'creditos_pendientes',
            mensaje: `⚠️ Tienes créditos pendientes por ${formatoMexicano(totalPendiente)}. Debes liquidarlos antes de solicitar un nuevo crédito.`,
            pesoTotal: 0,
            montoCredito: 0,
            montoPago: carrito.reduce((sum, item) => sum + item.importe, 0),
            productosCredito: [],
            productosPago: carrito,
            excedeLimite: true,
            puedeUsarCredito: false,
            montoExcedente: 0
        };
    }
    
    const productosConPeso = carrito.filter(item => {
        const producto = productosGlobales.find(p => p.clave === item.clave);
        return producto && producto.pesoCondicion === 'SI' && producto.peso > 0;
    });
    
    const productosSinPeso = carrito.filter(item => {
        const producto = productosGlobales.find(p => p.clave === item.clave);
        return producto && (producto.pesoCondicion !== 'SI' || producto.peso === 0);
    });
    
    console.log(`📊 Productos con peso: ${productosConPeso.length}`);
    console.log(`📊 Productos sin peso: ${productosSinPeso.length}`);
    
    let pesoTotal = 0;
    productosConPeso.forEach(item => {
        const producto = productosGlobales.find(p => p.clave === item.clave);
        if (producto) {
            pesoTotal += producto.peso * item.cantidad;
        }
    });
    
    let montoSinPeso = 0;
    productosSinPeso.forEach(item => {
        const producto = productosGlobales.find(p => p.clave === item.clave);
        if (producto) {
            const precioFinal = obtenerPrecioFinal(producto);
            const descuento = calcularDescuentoProducto(producto, item.cantidad);
            const importe = precioFinal.precio * item.cantidad * (1 - descuento / 100);
            montoSinPeso += importe;
        }
    });
    
    let montoConPeso = 0;
    productosConPeso.forEach(item => {
        const producto = productosGlobales.find(p => p.clave === item.clave);
        if (producto) {
            const precioFinal = obtenerPrecioFinal(producto);
            const descuento = calcularDescuentoProducto(producto, item.cantidad);
            const importe = precioFinal.precio * item.cantidad * (1 - descuento / 100);
            montoConPeso += importe;
        }
    });
    
       // ⭐ FIX: totalGeneral debe ser el TOTAL con IVA, no el subtotal
    const subtotalGeneral = montoConPeso + montoSinPeso;
    const totalGeneral = subtotalGeneral * 1.16;
    
    console.log(`⚖️ Peso total (con peso): ${pesoTotal.toFixed(2)} kg`);
    console.log(`💰 Monto productos con peso: ${formatoMexicano(montoConPeso)}`);
    console.log(`💰 Monto productos sin peso: ${formatoMexicano(montoSinPeso)}`);
    console.log(`💰 Total general: ${formatoMexicano(totalGeneral)}`);
    
    const hayProductosConPeso = productosConPeso.length > 0;
    const hayProductosSinPeso = productosSinPeso.length > 0;
    
    if (carrito.length === 0) {
        return {
            puedeCredito: false,
            tipo: 'sin_productos',
            mensaje: '⚠️ No hay productos en el carrito.',
            pesoTotal: 0,
            montoCredito: 0,
            montoPago: 0,
            productosCredito: [],
            productosPago: [],
            excedeLimite: false,
            puedeUsarCredito: false,
            montoExcedente: 0
        };
    }
    
    if (!clienteCreditoHabilitado) {
        return {
            puedeCredito: false,
            tipo: 'no_habilitado',
            mensaje: '⚠️ El crédito no está habilitado para este cliente.',
            pesoTotal: 0,
            montoCredito: 0,
            montoPago: totalGeneral,
            productosCredito: [],
            productosPago: carrito,
            excedeLimite: true,
            puedeUsarCredito: false,
            montoExcedente: totalGeneral
        };
    }
    
    if (hayProductosConPeso && !hayProductosSinPeso) {
        console.log('📦 Caso: Solo productos con peso');
        
        if (pesoTotal <= clienteLimiteCreditoPeso) {
            return {
                puedeCredito: true,
                tipo: 'credito_total',
                mensaje: `✅ Todos los productos van a crédito. Peso total: ${pesoTotal.toFixed(2)} kg (límite: ${clienteLimiteCreditoPeso} kg)`,
                pesoTotal: pesoTotal,
                montoCredito: totalGeneral,
                montoPago: 0,
                productosCredito: carrito,
                productosPago: [],
                excedeLimite: false,
                puedeUsarCredito: true,
                montoExcedente: 0
            };
        } else {
            const pesoExcedente = pesoTotal - clienteLimiteCreditoPeso;
            let pesoAcumulado = 0;
            let productosPago = [];
            let productosCredito = [];
            let montoPago = 0;
            let montoCredito = 0;
            
            const productosOrdenados = [...productosConPeso].sort((a, b) => {
                const prodA = productosGlobales.find(p => p.clave === a.clave);
                const prodB = productosGlobales.find(p => p.clave === b.clave);
                return (prodB ? prodB.peso * b.cantidad : 0) - (prodA ? prodA.peso * a.cantidad : 0);
            });
            
            for (const item of productosOrdenados) {
                const producto = productosGlobales.find(p => p.clave === item.clave);
                if (!producto) continue;
                
                const pesoItem = producto.peso * item.cantidad;
                const precioFinal = obtenerPrecioFinal(producto);
                const descuento = calcularDescuentoProducto(producto, item.cantidad);
                const importe = precioFinal.precio * item.cantidad * (1 - descuento / 100);
                
                if (pesoAcumulado + pesoItem <= pesoExcedente) {
                    productosPago.push(item);
                    montoPago += importe;
                    pesoAcumulado += pesoItem;
                } else {
                    const pesoRestante = pesoExcedente - pesoAcumulado;
                    if (pesoRestante > 0 && pesoItem > 0) {
                        const cantidadPago = pesoRestante / producto.peso;
                        const cantidadCredito = item.cantidad - cantidadPago;
                        
                        if (cantidadPago > 0) {
                            const importePago = precioFinal.precio * cantidadPago * (1 - descuento / 100);
                            productosPago.push({
                                ...item,
                                cantidad: cantidadPago,
                                _parcial: true
                            });
                            montoPago += importePago;
                        }
                        
                        if (cantidadCredito > 0) {
                            const importeCredito = precioFinal.precio * cantidadCredito * (1 - descuento / 100);
                            productosCredito.push({
                                ...item,
                                cantidad: cantidadCredito,
                                _parcial: true
                            });
                            montoCredito += importeCredito;
                        }
                    }
                    pesoAcumulado = pesoExcedente;
                }
            }
            
            for (const item of productosConPeso) {
                if (!productosPago.some(p => p.clave === item.clave && p._parcial === true) && 
                    !productosPago.some(p => p.clave === item.clave && p._parcial !== true)) {
                    const producto = productosGlobales.find(p => p.clave === item.clave);
                    if (!producto) continue;
                    
                    const precioFinal = obtenerPrecioFinal(producto);
                    const descuento = calcularDescuentoProducto(producto, item.cantidad);
                    const importe = precioFinal.precio * item.cantidad * (1 - descuento / 100);
                    
                    const yaProcesado = productosPago.some(p => p.clave === item.clave) || 
                                       productosCredito.some(p => p.clave === item.clave);
                    
                    if (!yaProcesado) {
                        productosCredito.push(item);
                        montoCredito += importe;
                    }
                }
            }
            
                        // ⭐ Fase 1B: Calcular excedente y crédito sobre el TOTAL (con IVA)
            const subtotalParcialPeso = montoPago + montoCredito;
            const factorIvaPeso = subtotalParcialPeso > 0 ? (totalGeneral / subtotalParcialPeso) : 1.16;
            const montoPagoConIvaPeso = montoPago * factorIvaPeso;
            const montoCreditoConIvaPeso = montoCredito * factorIvaPeso;

            return {
                puedeCredito: true,
                tipo: 'credito_parcial',
                mensaje: `⚠️ Excedes el límite de crédito. ${formatoMexicano(montoPagoConIvaPeso)} deben pagarse. El resto va a crédito.`,
                pesoTotal: pesoTotal,
                pesoExcedente: pesoExcedente,
                montoCredito: montoCreditoConIvaPeso,
                montoPago: montoPagoConIvaPeso,
                productosCredito: productosCredito,
                productosPago: productosPago,
                excedeLimite: true,
                puedeUsarCredito: true,
                montoExcedente: montoPagoConIvaPeso
            };
        }
    }
    
    if (!hayProductosConPeso && hayProductosSinPeso) {
        console.log('📦 Caso: Solo productos sin peso');
        
        if (montoSinPeso <= clienteLimiteCreditoMonto) {
            return {
                puedeCredito: true,
                tipo: 'credito_total',
                mensaje: `✅ Todos los productos van a crédito. Monto: ${formatoMexicano(montoSinPeso)} (límite: ${formatoMexicano(clienteLimiteCreditoMonto)})`,
                pesoTotal: 0,
                montoCredito: montoSinPeso,
                montoPago: 0,
                productosCredito: carrito,
                productosPago: [],
                excedeLimite: false,
                puedeUsarCredito: true,
                montoExcedente: 0
            };
        } else {
            const montoExcedente = montoSinPeso - clienteLimiteCreditoMonto;
            let montoAcumulado = 0;
            let productosPago = [];
            let productosCredito = [];
            let montoPago = 0;
            let montoCredito = 0;
            
            const productosOrdenados = [...productosSinPeso].sort((a, b) => {
                const prodA = productosGlobales.find(p => p.clave === a.clave);
                const prodB = productosGlobales.find(p => p.clave === b.clave);
                const precioA = prodA ? prodA.precio * a.cantidad : 0;
                const precioB = prodB ? prodB.precio * b.cantidad : 0;
                return precioB - precioA;
            });
            
            for (const item of productosOrdenados) {
                const producto = productosGlobales.find(p => p.clave === item.clave);
                if (!producto) continue;
                
                const precioFinal = obtenerPrecioFinal(producto);
                const descuento = calcularDescuentoProducto(producto, item.cantidad);
                const importe = precioFinal.precio * item.cantidad * (1 - descuento / 100);
                
                if (montoAcumulado + importe <= montoExcedente) {
                    productosPago.push(item);
                    montoPago += importe;
                    montoAcumulado += importe;
                } else {
                    const montoRestante = montoExcedente - montoAcumulado;
                    if (montoRestante > 0 && importe > 0) {
                        const cantidadPago = montoRestante / (precioFinal.precio * (1 - descuento / 100));
                        const cantidadCredito = item.cantidad - cantidadPago;
                        
                        if (cantidadPago > 0) {
                            const importePago = precioFinal.precio * cantidadPago * (1 - descuento / 100);
                            productosPago.push({
                                ...item,
                                cantidad: cantidadPago,
                                _parcial: true
                            });
                            montoPago += importePago;
                        }
                        
                        if (cantidadCredito > 0) {
                            const importeCredito = precioFinal.precio * cantidadCredito * (1 - descuento / 100);
                            productosCredito.push({
                                ...item,
                                cantidad: cantidadCredito,
                                _parcial: true
                            });
                            montoCredito += importeCredito;
                        }
                    }
                    montoAcumulado = montoExcedente;
                }
            }
            
            for (const item of productosSinPeso) {
                if (!productosPago.some(p => p.clave === item.clave && p._parcial === true) && 
                    !productosPago.some(p => p.clave === item.clave && p._parcial !== true)) {
                    const producto = productosGlobales.find(p => p.clave === item.clave);
                    if (!producto) continue;
                    
                    const precioFinal = obtenerPrecioFinal(producto);
                    const descuento = calcularDescuentoProducto(producto, item.cantidad);
                    const importe = precioFinal.precio * item.cantidad * (1 - descuento / 100);
                    
                    const yaProcesado = productosPago.some(p => p.clave === item.clave) || 
                                       productosCredito.some(p => p.clave === item.clave);
                    
                    if (!yaProcesado) {
                        productosCredito.push(item);
                        montoCredito += importe;
                    }
                }
            }
            
                        // ⭐ Fase 1B: Calcular excedente y crédito sobre el TOTAL (con IVA), no sobre el subtotal
            const subtotalParcial = montoPago + montoCredito;
            const factorIva = subtotalParcial > 0 ? (totalGeneral / subtotalParcial) : 1.16;
            const montoPagoConIva = montoPago * factorIva;
            const montoCreditoConIva = montoCredito * factorIva;

            return {
                puedeCredito: true,
                tipo: 'credito_parcial',
                mensaje: `⚠️ Excedes el límite de crédito. ${formatoMexicano(montoPagoConIva)} deben pagarse. El resto va a crédito.`,
                pesoTotal: pesoTotal,
                pesoExcedente: pesoExcedente,
                montoCredito: montoCreditoConIva,   // <-- Con IVA
                montoPago: montoPagoConIva,         // <-- Con IVA
                productosCredito: productosCredito,
                productosPago: productosPago,
                excedeLimite: true,
                puedeUsarCredito: true,
                montoExcedente: montoPagoConIva     // <-- Con IVA
            };
        }
    }
    
    if (hayProductosConPeso && hayProductosSinPeso) {
        console.log('📦 Caso: Productos mixtos');
        
        const pesoCumple = pesoTotal <= clienteLimiteCreditoPeso;
        const montoCumple = montoSinPeso <= clienteLimiteCreditoMonto;
        
        if (pesoCumple && montoCumple) {
            return {
                puedeCredito: true,
                tipo: 'credito_total',
                mensaje: `✅ Todos los productos van a crédito. Peso: ${pesoTotal.toFixed(2)} kg, Monto: ${formatoMexicano(montoSinPeso)}`,
                pesoTotal: pesoTotal,
                montoCredito: totalGeneral,
                montoPago: 0,
                productosCredito: carrito,
                productosPago: [],
                excedeLimite: false,
                puedeUsarCredito: true,
                montoExcedente: 0
            };
        } else {
            let productosPago = [];
            let productosCredito = [];
            let montoPago = 0;
            let montoCredito = 0;
            
            if (!pesoCumple) {
                const pesoExcedenteTotal = pesoTotal - clienteLimiteCreditoPeso;
                let pesoAcumulado = 0;
                
                const prodPesoOrdenados = [...productosConPeso].sort((a, b) => {
                    const prodA = productosGlobales.find(p => p.clave === a.clave);
                    const prodB = productosGlobales.find(p => p.clave === b.clave);
                    return (prodB ? prodB.peso * b.cantidad : 0) - (prodA ? prodA.peso * a.cantidad : 0);
                });
                
                for (const item of prodPesoOrdenados) {
                    const producto = productosGlobales.find(p => p.clave === item.clave);
                    if (!producto) continue;
                    
                    const pesoItem = producto.peso * item.cantidad;
                    const precioFinal = obtenerPrecioFinal(producto);
                    const descuento = calcularDescuentoProducto(producto, item.cantidad);
                    const importe = precioFinal.precio * item.cantidad * (1 - descuento / 100);
                    
                    if (pesoAcumulado + pesoItem <= pesoExcedenteTotal) {
                        productosPago.push(item);
                        montoPago += importe;
                        pesoAcumulado += pesoItem;
                    } else {
                        const pesoRestante = pesoExcedenteTotal - pesoAcumulado;
                        if (pesoRestante > 0 && pesoItem > 0) {
                            const cantidadPago = pesoRestante / producto.peso;
                            const cantidadCredito = item.cantidad - cantidadPago;
                            
                            if (cantidadPago > 0) {
                                const importePago = precioFinal.precio * cantidadPago * (1 - descuento / 100);
                                productosPago.push({
                                    ...item,
                                    cantidad: cantidadPago,
                                    _parcial: true
                                });
                                montoPago += importePago;
                            }
                            
                            if (cantidadCredito > 0) {
                                const importeCredito = precioFinal.precio * cantidadCredito * (1 - descuento / 100);
                                productosCredito.push({
                                    ...item,
                                    cantidad: cantidadCredito,
                                    _parcial: true
                                });
                                montoCredito += importeCredito;
                            }
                        }
                        pesoAcumulado = pesoExcedenteTotal;
                    }
                }
            }
            
            if (!montoCumple) {
                const montoExcedenteTotal = montoSinPeso - clienteLimiteCreditoMonto;
                let montoAcumulado = 0;
                
                const prodSinPesoOrdenados = [...productosSinPeso].sort((a, b) => {
                    const prodA = productosGlobales.find(p => p.clave === a.clave);
                    const prodB = productosGlobales.find(p => p.clave === b.clave);
                    const precioA = prodA ? prodA.precio * a.cantidad : 0;
                    const precioB = prodB ? prodB.precio * b.cantidad : 0;
                    return precioB - precioA;
                });
                
                for (const item of prodSinPesoOrdenados) {
                    if (productosPago.some(p => p.clave === item.clave) || 
                        productosCredito.some(p => p.clave === item.clave)) continue;
                    
                    const producto = productosGlobales.find(p => p.clave === item.clave);
                    if (!producto) continue;
                    
                    const precioFinal = obtenerPrecioFinal(producto);
                    const descuento = calcularDescuentoProducto(producto, item.cantidad);
                    const importe = precioFinal.precio * item.cantidad * (1 - descuento / 100);
                    
                    if (montoAcumulado + importe <= montoExcedenteTotal) {
                        productosPago.push(item);
                        montoPago += importe;
                        montoAcumulado += importe;
                    } else {
                        const montoRestante = montoExcedenteTotal - montoAcumulado;
                        if (montoRestante > 0 && importe > 0) {
                            const cantidadPago = montoRestante / (precioFinal.precio * (1 - descuento / 100));
                            const cantidadCredito = item.cantidad - cantidadPago;
                            
                            if (cantidadPago > 0) {
                                const importePago = precioFinal.precio * cantidadPago * (1 - descuento / 100);
                                productosPago.push({
                                    ...item,
                                    cantidad: cantidadPago,
                                    _parcial: true
                                });
                                montoPago += importePago;
                            }
                            
                            if (cantidadCredito > 0) {
                                const importeCredito = precioFinal.precio * cantidadCredito * (1 - descuento / 100);
                                productosCredito.push({
                                    ...item,
                                    cantidad: cantidadCredito,
                                    _parcial: true
                                });
                                montoCredito += importeCredito;
                            }
                        }
                        montoAcumulado = montoExcedenteTotal;
                    }
                }
            }
            
            for (const item of carrito) {
                if (!productosPago.some(p => p.clave === item.clave && p._parcial === true) && 
                    !productosPago.some(p => p.clave === item.clave && p._parcial !== true) &&
                    !productosCredito.some(p => p.clave === item.clave && p._parcial === true) &&
                    !productosCredito.some(p => p.clave === item.clave && p._parcial !== true)) {
                    const producto = productosGlobales.find(p => p.clave === item.clave);
                    if (!producto) continue;
                    
                    const precioFinal = obtenerPrecioFinal(producto);
                    const descuento = calcularDescuentoProducto(producto, item.cantidad);
                    const importe = precioFinal.precio * item.cantidad * (1 - descuento / 100);
                    
                    productosCredito.push(item);
                    montoCredito += importe;
                }
            }
            
                        // ⭐ Fase 1B: Calcular excedente y crédito sobre el TOTAL (con IVA), no sobre el subtotal
            const subtotalParcial = montoPago + montoCredito;
            const factorIva = subtotalParcial > 0 ? (totalGeneral / subtotalParcial) : 1.16;
            const montoPagoConIva = montoPago * factorIva;
            const montoCreditoConIva = montoCredito * factorIva;

            return {
                puedeCredito: true,
                tipo: 'credito_parcial',
                mensaje: `⚠️ Excedes el límite de crédito. ${formatoMexicano(montoPagoConIva)} deben pagarse. El resto va a crédito.`,
                pesoTotal: pesoTotal,
                montoCredito: montoCreditoConIva,   // <-- Con IVA
                montoPago: montoPagoConIva,         // <-- Con IVA
                productosCredito: productosCredito,
                productosPago: productosPago,
                excedeLimite: true,
                puedeUsarCredito: true,
                montoExcedente: montoPagoConIva     // <-- Con IVA
            };
        }
    }
    
    return {
        puedeCredito: false,
        tipo: 'sin_productos',
        mensaje: '⚠️ No hay productos en el carrito.',
        pesoTotal: 0,
        montoCredito: 0,
        montoPago: 0,
        productosCredito: [],
        productosPago: [],
        excedeLimite: false,
        puedeUsarCredito: false,
        montoExcedente: 0
    };
}

// ============================================
// CARRITO
// ============================================

function agregarAlCarrito(clave) {
    const producto = productosGlobales.find(p => p.clave === clave);
    if (!producto) {
        mostrarNotificacion('❌ Producto no encontrado');
        return;
    }
    
    if (!producto.permitido) {
        mostrarNotificacion('🚫 Este producto no está disponible para venta en este momento.');
        return;
    }
    
    if (producto.requiereMinPiezas && producto.minPiezas > 0) {
        const existente = carrito.find(item => item.clave === clave);
        const cantidadActual = existente ? existente.cantidad : 0;
        const nuevaCantidad = cantidadActual + 1;
        
        if (nuevaCantidad < producto.minPiezas) {
            mostrarNotificacion(`ℹ️ Este producto requiere mínimo ${producto.minPiezas} piezas para completar la compra.`);
        }
    }
    
    const existente = carrito.find(item => item.clave === clave);
    
    if (existente) {
        existente.cantidad += 1;
        actualizarItemCarrito(existente);
    } else {
        const precioFinal = obtenerPrecioFinal(producto);
        const descuento = calcularDescuentoProducto(producto, 1);
        const precioConDescuento = precioFinal.precio * (1 - descuento / 100);
        
        carrito.push({
            clave: producto.clave,
            nombre: producto.nombre,
            descripcion: producto.descripcion,
            precio: precioFinal.precio,
            precioCompra: producto.precioCompra,
            cantidad: 1,
            descuento: descuento,
            importe: precioConDescuento,
            personalizado: precioFinal.personalizado,
            pesoCondicion: producto.pesoCondicion,
            peso: producto.peso,
            requiereMinPiezas: producto.requiereMinPiezas,
            minPiezas: producto.minPiezas,
            pxv: producto.pxv,
            descuentoVolumenP: producto.descuentoVolumenP,
            descuentoVolumenQ: producto.descuentoVolumenQ
        });
    }
    
    renderizarCarrito();
    mostrarNotificacion('✅ Producto agregado al carrito');
}

function actualizarItemCarrito(item) {
    const producto = productosGlobales.find(p => p.clave === item.clave);
    if (!producto) return;
    
    const descuento = calcularDescuentoProducto(producto, item.cantidad);
    item.descuento = descuento;
    item.importe = item.precio * item.cantidad * (1 - descuento / 100);
}

function cambiarCantidad(clave, nuevaCantidad) {
    const item = carrito.find(i => i.clave === clave);
    if (!item) return;
    
    const producto = productosGlobales.find(p => p.clave === clave);
    if (!producto) return;
    
    if (nuevaCantidad <= 0) {
        eliminarDelCarrito(clave);
        return;
    }
    
    if (producto.requiereMinPiezas && producto.minPiezas > 0) {
        if (nuevaCantidad < producto.minPiezas) {
            mostrarNotificacion(`ℹ️ Este producto requiere mínimo ${producto.minPiezas} piezas para completar la compra.`);
        }
    }
    
    item.cantidad = nuevaCantidad;
    actualizarItemCarrito(item);
    renderizarCarrito();
}

function eliminarDelCarrito(clave) {
    carrito = carrito.filter(i => i.clave !== clave);
    renderizarCarrito();
}

function vaciarCarrito() {
    if (carrito.length === 0) return;
    if (!confirm('¿Seguro que quieres vaciar el carrito?')) return;
    carrito = [];
    renderizarCarrito();
}

// ============================================
// VERIFICAR MÍNIMO DE PIEZAS
// ============================================

function verificarMinimoPiezas() {
    const productosConMinimo = carrito.filter(item => 
        item.requiereMinPiezas && item.minPiezas > 0
    );
    
    if (productosConMinimo.length === 0) {
        return { cumple: true, detalle: [] };
    }
    
    let cumple = true;
    const detalle = [];
    
    productosConMinimo.forEach(item => {
        const ok = item.cantidad >= item.minPiezas;
        if (!ok) cumple = false;
        detalle.push({
            nombre: item.nombre,
            minimo: item.minPiezas,
            actual: item.cantidad
        });
    });
    
    return { cumple, detalle };
}

// ============================================
// RENDERIZAR CARRITO
// ============================================

function renderizarCarrito() {
    const cartContent = document.getElementById('cartContent');
    const cartTotales = document.getElementById('cartTotales');
    const btnComprar = document.getElementById('btnComprar');
    
    if (carrito.length === 0) {
        cartContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-cart-plus"></i>
                <h4>Carrito vacío</h4>
                <p>Agrega productos desde la lista de resultados.</p>
            </div>
        `;
        cartTotales.style.display = 'none';
        btnComprar.disabled = false;
        btnComprar.title = '';
        btnComprar.style.opacity = '1';
        btnComprar.style.cursor = 'pointer';
        return;
    }
    
    const verificarPeso = verificarPesoMinimo();
    const verificarMinPiezas = verificarMinimoPiezas();
    
    let html = `
        <table class="cart-table">
            <thead>
                <tr>
                    <th>Producto</th>
                    <th>Precio</th>
                    <th>Cantidad</th>
                    <th>Descuento</th>
                    <th>Importe</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
    `;
    
    let subtotalSinDescuento = 0;
    let descuentoTotal = 0;
    let subtotal = 0;
    
    carrito.forEach(item => {
        const importeBase = item.precio * item.cantidad;
        const descuentoItem = importeBase * (item.descuento / 100);
        const importeFinal = importeBase - descuentoItem;
        
        subtotalSinDescuento += importeBase;
        descuentoTotal += descuentoItem;
        subtotal += importeFinal;
        
        let pesoInfo = '';
        let pesoTotalItem = 0;
        if (item.pesoCondicion === 'SI' && item.peso > 0) {
            pesoTotalItem = item.peso * item.cantidad;
            pesoInfo = `<br><small style="color:var(--text-gray);">⚖️ ${item.peso} kg/unidad → ${pesoTotalItem.toFixed(2)} kg total</small>`;
        }
        
        let minPiezasInfo = '';
        if (item.requiereMinPiezas && item.minPiezas > 0) {
            const cumple = item.cantidad >= item.minPiezas;
            const icono = cumple ? '✅' : '⚠️';
            const color = cumple ? '#16a34a' : '#92400e';
            minPiezasInfo = `<br><small style="color:${color};font-weight:600;">${icono} Mínimo: ${item.minPiezas} piezas (${item.cantidad} actuales)</small>`;
        }
        
        let pxvInfo = '';
        if (item.pxv === 'PXV' && item.pesoCondicion === 'SI') {
            let info = '';
            if (item.cantidad >= 250 && item.descuentoVolumenQ > 0) {
                info = `✅ 5T (${item.descuentoVolumenQ}% extra)`;
            } else if (item.cantidad >= 150 && item.descuentoVolumenP > 0) {
                info = `✅ 3T (${item.descuentoVolumenP}% extra)`;
            } else {
                info = `ℹ️ ${150 - item.cantidad} und para 3T | ${250 - item.cantidad} und para 5T`;
            }
            pxvInfo = `<br><small style="color:var(--text-gray);">📦 ${info}</small>`;
        }
        
        html += `
            <tr>
                <td>
                    <strong>${item.nombre}</strong>
                    ${pesoInfo}
                    ${minPiezasInfo}
                    ${pxvInfo}
                    <br><small style="color:var(--text-gray);">${item.clave}</small>
                </td>
                <td>${formatoMexicano(item.precio)}</td>
                <td>
                    <input type="number" class="cantidad-input" 
                           value="${item.cantidad}" min="1" 
                           onchange="cambiarCantidad('${item.clave}', parseInt(this.value))">
                </td>
                <td>${item.descuento}%</td>
                <td>${formatoMexicano(importeFinal)}</td>
                <td>
                    <button class="btn-eliminar" onclick="eliminarDelCarrito('${item.clave}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    const iva = subtotal * 0.16;
    const total = subtotal + iva;
    
    html += `
            </tbody>
        </table>
    `;
    
    if (!verificarMinPiezas.cumple) {
        html += `
            <div style="margin-top: 1.5rem; padding: 1.5rem; border-radius: 12px; background: #fef3c7; border: 2px solid #fde68a;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <span style="font-size: 1.5rem;">⚠️</span>
                    <span style="font-weight: 700; color: #92400e; font-size: 1.1rem;">
                        Mínimo de piezas no cumplido
                    </span>
                </div>
                <div style="background: white; padding: 0.8rem 1rem; border-radius: 8px; margin: 0.5rem 0;">
                    ${verificarMinPiezas.detalle.map(d => `
                        <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.9rem; border-bottom: 1px solid #f0f0f0;">
                            <span>${d.nombre}</span>
                            <span style="color: #92400e; font-weight: 600;">${d.actual} / ${d.minimo} piezas</span>
                        </div>
                    `).join('')}
                </div>
                <div style="background: #fef3c7; padding: 0.8rem 1rem; border-radius: 8px; margin-top: 0.5rem; border: 1px solid #fde68a;">
                    <p style="margin: 0; font-weight: 600; color: #92400e;">
                        ⚠️ Debes completar el mínimo de piezas para poder realizar la compra.
                    </p>
                </div>
            </div>
        `;
    }
    
    if (verificarPeso.productosConPeso > 0) {
        let detalleProductos = '';
        verificarPeso.productosAfectados.forEach(p => {
            detalleProductos += `
                <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.9rem; border-bottom: 1px solid #f0f0f0;">
                    <span>${p.nombre}</span>
                    <span>${p.cantidad} x ${p.pesoUnitario} kg = ${p.pesoTotal.toFixed(2)} kg</span>
                </div>
            `;
        });
        
        const pesoRestante = PESO_MINIMO_TONELADA - verificarPeso.pesoTotal;
        
        html += `
            <div style="margin-top: 1.5rem; padding: 1.5rem; border-radius: 12px; background: ${verificarPeso.cumple ? '#dcfce7' : '#fef3c7'}; border: 2px solid ${verificarPeso.cumple ? '#bbf7d0' : '#fde68a'};">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <span style="font-size: 1.5rem;">${verificarPeso.cumple ? '✅' : '⚠️'}</span>
                    <span style="font-weight: 700; color: ${verificarPeso.cumple ? '#16a34a' : '#92400e'}; font-size: 1.1rem;">
                        ${verificarPeso.cumple ? '¡Peso mínimo cumplido!' : 'Peso mínimo requerido'}
                    </span>
                </div>
                <div style="background: white; padding: 0.8rem 1rem; border-radius: 8px; margin: 0.5rem 0;">
                    <div style="display: flex; justify-content: space-between; font-weight: 600; color: var(--primary-dark); border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; margin-bottom: 0.5rem;">
                        <span>Producto</span>
                        <span>Peso total</span>
                    </div>
                    ${detalleProductos}
                    <div style="display: flex; justify-content: space-between; font-weight: 700; color: var(--primary-dark); padding-top: 0.5rem; margin-top: 0.5rem; border-top: 2px solid #e2e8f0;">
                        <span>TOTAL PESO</span>
                        <span>${verificarPeso.pesoTotal.toFixed(2)} kg</span>
                    </div>
                </div>
                ${!verificarPeso.cumple ? `
                    <div style="background: #fef3c7; padding: 0.8rem 1rem; border-radius: 8px; margin-top: 0.5rem; border: 1px solid #fde68a;">
                        <p style="margin: 0; font-weight: 600; color: #92400e;">
                            ⚠️ Te faltan <strong>${pesoRestante.toFixed(2)} kg</strong> para alcanzar la tonelada (${PESO_MINIMO_TONELADA} kg).
                            <br><small style="font-weight: normal;">Puedes combinar productos como estucos y adhesivos para completar el peso.</small>
                        </p>
                    </div>
                ` : `
                    <div style="background: #dcfce7; padding: 0.8rem 1rem; border-radius: 8px; margin-top: 0.5rem; border: 1px solid #bbf7d0;">
                        <p style="margin: 0; font-weight: 600; color: #16a34a;">
                            ✅ ¡Ya puedes realizar tu compra! Has alcanzado el peso mínimo de 1 tonelada.
                        </p>
                    </div>
                `}
            </div>
        `;
    }
    
    cartContent.innerHTML = html;
    cartTotales.style.display = 'block';
    
    document.getElementById('subtotalSinDescuento').textContent = formatoMexicano(subtotalSinDescuento);
    document.getElementById('descuentoTotal').textContent = '-' + formatoMexicano(descuentoTotal);
    document.getElementById('subtotal').textContent = formatoMexicano(subtotal);
    document.getElementById('iva').textContent = formatoMexicano(iva);
    document.getElementById('total').textContent = formatoMexicano(total);
    
    let puedeComprar = true;
    let motivoBloqueo = '';
    
    if (verificarPeso.productosConPeso > 0 && !verificarPeso.cumple) {
        puedeComprar = false;
        motivoBloqueo = '⚠️ Debes completar el peso mínimo de 1 tonelada (1000 kg) para productos con peso.';
    }
    
    if (!verificarMinPiezas.cumple) {
        puedeComprar = false;
        motivoBloqueo = '⚠️ Debes completar el mínimo de piezas requerido para todos los productos.';
    }
    
    if (puedeComprar) {
        btnComprar.disabled = false;
        btnComprar.title = '';
        btnComprar.style.opacity = '1';
        btnComprar.style.cursor = 'pointer';
    } else {
        btnComprar.disabled = true;
        btnComprar.title = motivoBloqueo;
        btnComprar.style.opacity = '0.5';
        btnComprar.style.cursor = 'not-allowed';
    }
}

// ============================================
// VERIFICACIÓN DE PESO MÍNIMO
// ============================================

function verificarPesoMinimo() {
    console.log('🔍 Verificando peso mínimo...');
    
    const productosConPeso = carrito.filter(item => {
        const producto = productosGlobales.find(p => p.clave === item.clave);
        return producto && producto.pesoCondicion === 'SI' && producto.peso > 0;
    });
    
    console.log(`📊 Productos con peso en carrito: ${productosConPeso.length}`);
    
    if (productosConPeso.length === 0) {
        return { 
            cumple: true, 
            pesoTotal: 0, 
            productosConPeso: 0,
            mensaje: '',
            productosAfectados: []
        };
    }
    
    let pesoTotal = 0;
    const productosAfectados = [];
    
    productosConPeso.forEach(item => {
        const producto = productosGlobales.find(p => p.clave === item.clave);
        if (producto) {
            const pesoItem = producto.peso * item.cantidad;
            pesoTotal += pesoItem;
            productosAfectados.push({
                nombre: item.nombre,
                cantidad: item.cantidad,
                pesoUnitario: producto.peso,
                pesoTotal: pesoItem
            });
        }
    });
    
    console.log(`⚖️ PESO TOTAL: ${pesoTotal.toFixed(2)} kg`);
    
    if (pesoTotal >= PESO_MINIMO_TONELADA) {
        return { 
            cumple: true, 
            pesoTotal: pesoTotal, 
            productosConPeso: productosConPeso.length,
            productosAfectados: productosAfectados,
            mensaje: `✅ ¡Cumpliste con el peso mínimo! Total: ${pesoTotal.toFixed(2)} kg (1 tonelada)` 
        };
    } else {
        return { 
            cumple: false, 
            pesoTotal: pesoTotal, 
            productosConPeso: productosConPeso.length,
            productosAfectados: productosAfectados,
            mensaje: `⚠️ Peso total: ${pesoTotal.toFixed(2)} kg. Se requiere mínimo ${PESO_MINIMO_TONELADA} kg (1 tonelada). Faltan ${(PESO_MINIMO_TONELADA - pesoTotal).toFixed(2)} kg.` 
        };
    }
}

// ============================================
// MODAL DE DIRECCIÓN DE ENVÍO
// ============================================

function abrirModalDireccion() {
    if (carrito.length === 0) {
        mostrarNotificacion('⚠️ El carrito está vacío');
        return;
    }
    
    const verificarPeso = verificarPesoMinimo();
    if (verificarPeso.productosConPeso > 0 && !verificarPeso.cumple) {
        mostrarNotificacion('⚠️ ' + verificarPeso.mensaje);
        return;
    }
    
    const verificarMinPiezas = verificarMinimoPiezas();
    if (!verificarMinPiezas.cumple) {
        mostrarNotificacion('⚠️ Debes completar el mínimo de piezas requerido para todos los productos.');
        return;
    }
    
    cargarDireccionesCliente();
    
    document.getElementById('dirCalle').value = '';
    document.getElementById('dirColonia').value = '';
    document.getElementById('dirAlcaldia').value = '';
    document.getElementById('dirEstado').value = '';
    document.getElementById('dirCP').value = '';
    document.getElementById('dirMaps').value = '';
    document.getElementById('dirTelefono').value = '';
    document.getElementById('dirNombreRecibe').value = '';
    document.getElementById('dirGuardarNombre').value = '';
    document.getElementById('dirGuardarCheck').checked = false;
    document.getElementById('dirGuardarCampos').style.display = 'none';
    document.getElementById('modalDireccionMensaje').innerHTML = '';
    document.getElementById('modalDireccionMensaje').style.display = 'none';
    
    // ⭐ Limpiar el nombre de la dirección seleccionada al abrir el modal
    direccionSeleccionadaNombre = null;
    
    document.getElementById('modalDireccion').classList.add('active');
}

function cargarDireccionSeleccionada() {
    const select = document.getElementById('direccionSelector');
    const index = parseInt(select.value);
    
    if (isNaN(index) || index < 0 || index >= direccionesCliente.length) {
        // No hay dirección seleccionada: limpiar campos y variable
        direccionSeleccionadaNombre = null;
        document.getElementById('dirCalle').value = '';
        document.getElementById('dirColonia').value = '';
        document.getElementById('dirAlcaldia').value = '';
        document.getElementById('dirEstado').value = '';
        document.getElementById('dirCP').value = '';
        document.getElementById('dirMaps').value = '';
        document.getElementById('dirTelefono').value = '';
        document.getElementById('dirNombreRecibe').value = '';
        document.getElementById('dirGuardarNombre').value = '';
        document.getElementById('dirGuardarCheck').checked = false;
        document.getElementById('dirGuardarCampos').style.display = 'none';
        return;
    }
    
    const dir = direccionesCliente[index];
    
    // ⭐ Guardar el nombre de la dirección seleccionada
    direccionSeleccionadaNombre = dir.nombre || 'Sin nombre';
    
    document.getElementById('dirCalle').value = dir.calle || '';
    document.getElementById('dirColonia').value = dir.colonia || '';
    document.getElementById('dirAlcaldia').value = dir.alcaldia || '';
    document.getElementById('dirEstado').value = dir.estado || '';
    document.getElementById('dirCP').value = dir.cp || '';
    document.getElementById('dirMaps').value = dir.mapsUrl || '';
    document.getElementById('dirTelefono').value = dir.telefono || '';
    document.getElementById('dirNombreRecibe').value = dir.nombreRecibe || '';
    
    document.getElementById('dirGuardarCheck').checked = false;
    document.getElementById('dirGuardarCampos').style.display = 'none';
}

function cerrarModalDireccion() {
    document.getElementById('modalDireccion').classList.remove('active');
}

async function continuarConPago() {
    const calle = document.getElementById('dirCalle').value.trim();
    const colonia = document.getElementById('dirColonia').value.trim();
    const alcaldia = document.getElementById('dirAlcaldia').value.trim();
    const estado = document.getElementById('dirEstado').value.trim();
    const cp = document.getElementById('dirCP').value.trim();
    const telefono = document.getElementById('dirTelefono').value.trim();
    const nombreRecibe = document.getElementById('dirNombreRecibe').value.trim();
    const mapsUrl = document.getElementById('dirMaps').value.trim();
    
    if (!mapsUrl) {
        mostrarMensajeModalDireccion('error', '⚠️ La URL de Google Maps es obligatoria. Por favor, proporciona la ubicación exacta.');
        return;
    }
    
    if (!calle || !colonia || !alcaldia || !estado || !cp || !telefono || !nombreRecibe) {
        mostrarMensajeModalDireccion('error', '⚠️ Por favor, completa todos los campos obligatorios de dirección.');
        return;
    }
    
        const guardarDireccion = document.getElementById('dirGuardarCheck').checked;
    let nombreDireccion = '';
    
    // ⭐ Prioridad 1: Si el usuario seleccionó una dirección del <select>, usar su nombre
    if (direccionSeleccionadaNombre) {
        nombreDireccion = direccionSeleccionadaNombre;
    } else {
        // Prioridad 2: Si el usuario escribió un nombre en el campo de guardar
        nombreDireccion = document.getElementById('dirGuardarNombre').value.trim();
    }
    
    // Si va a guardar la dirección y no tiene nombre, pedir nombre
    if (guardarDireccion && !nombreDireccion) {
        mostrarMensajeModalDireccion('error', '⚠️ Por favor, asigna un nombre a la dirección para guardarla.');
        return;
    }
    
    // Si no hay nombre, usar "Sin nombre" como fallback
    if (!nombreDireccion) {
        nombreDireccion = 'Sin nombre';
    }
    
    if (guardarDireccion && nombreDireccion && nombreDireccion !== 'Sin nombre') {
        const guardado = await guardarNuevaDireccion({
            nombre: nombreDireccion,
            calle: calle,
            colonia: colonia,
            alcaldia: alcaldia,
            estado: estado,
            cp: cp,
            mapsUrl: mapsUrl,
            telefono: telefono,
            nombreRecibe: nombreRecibe
        });
        
        if (!guardado) {
            mostrarMensajeModalDireccion('error', '❌ Error al guardar la dirección. Intenta de nuevo.');
            return;
        }
    }
    
    window.datosEnvio = {
        calle: calle,
        colonia: colonia,
        alcaldia: alcaldia,
        estado: estado,
        cp: cp,
        mapsUrl: mapsUrl,
        telefono: telefono,
        nombreRecibe: nombreRecibe,
        nombreDireccion: nombreDireccion
    };
    
    cerrarModalDireccion();
    abrirModalFechaEntrega();
}

function mostrarMensajeModalDireccion(tipo, mensaje) {
    const div = document.getElementById('modalDireccionMensaje');
    div.className = tipo === 'exito' ? 'mensaje-exito' : 'mensaje-error';
    div.innerHTML = mensaje;
    div.style.display = 'block';
}

// ============================================
// MODAL DE FECHA DE ENTREGA
// ============================================

function abrirModalFechaEntrega() {
    fechaEntregaSeleccionada = null;
    document.getElementById('fechaSeleccionadaInfo').style.display = 'none';
    document.getElementById('btnContinuarAlPago').disabled = true;
    document.getElementById('modalFechaEntregaMensaje').style.display = 'none';
    generarCalendario();
    document.getElementById('modalFechaEntrega').classList.add('active');
}

function cerrarModalFechaEntrega() {
    document.getElementById('modalFechaEntrega').classList.remove('active');
    fechaEntregaSeleccionada = null;
}

function generarCalendario() {
    const ahora = new Date();
    const horaActual = ahora.getHours();
    const minutosActuales = ahora.getMinutes();
    const diaSemanaHoy = ahora.getDay(); // 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
    
    const esDespuesDe540 = (horaActual > 17) || (horaActual === 17 && minutosActuales >= 40);
    
    // ⭐ R5: Regla especial para viernes >17:40, sábado y domingo
    // Deshabilita SOLO el siguiente lunes y el siguiente martes (no todos los del mes)
    const esViernesDespuesDe540 = (diaSemanaHoy === 5 && esDespuesDe540);
    const esSabado = (diaSemanaHoy === 6);
    const esDomingo = (diaSemanaHoy === 0);
    const deshabilitarSiguienteLunesMartes = esViernesDespuesDe540 || esSabado || esDomingo;
    
    // Calcular las fechas exactas del siguiente lunes y siguiente martes
    let siguienteLunes = null;
    let siguienteMartes = null;
    
    if (deshabilitarSiguienteLunesMartes) {
        const cursor = new Date(ahora);
        cursor.setHours(0, 0, 0, 0);
        
        // Avanzar hasta encontrar el primer lunes (día 1)
        while (cursor.getDay() !== 1) {
            cursor.setDate(cursor.getDate() + 1);
        }
        siguienteLunes = new Date(cursor);
        
        // El siguiente martes es el día después del siguiente lunes
        siguienteMartes = new Date(cursor);
        siguienteMartes.setDate(siguienteMartes.getDate() + 1);
    }
    
    const fechaMinima = new Date(ahora);
    fechaMinima.setDate(fechaMinima.getDate() + (esDespuesDe540 ? 2 : 1) + 1);
    fechaMinima.setHours(0, 0, 0, 0);
    
    const diasAMostrar = 30;
    const container = document.getElementById('calendarioContainer');
    
    let html = `
        <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:0.5rem; text-align:center; font-size:0.85rem; font-weight:600; color:var(--text-gray); margin-bottom:0.5rem;">
            <div>Dom</div><div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div>
        </div>
        <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:0.5rem;">
    `;
    
    const diaSemana = ahora.getDay();
    for (let i = 0; i < diaSemana; i++) html += `<div></div>`;
    
    for (let i = 0; i < diasAMostrar; i++) {
        const fecha = new Date(ahora);
        fecha.setDate(fecha.getDate() + i);
        fecha.setHours(0, 0, 0, 0);
        
        const diaSemanaFecha = fecha.getDay();
        const esFinDeSemana = (diaSemanaFecha === 0 || diaSemanaFecha === 6);
        const esAntesDeFechaMinima = fecha < fechaMinima;
        const esHoy = (i === 0);
        
        // ⭐ R5: Solo bloquear si esta fecha coincide EXACTAMENTE con el siguiente lunes o martes
        const esSiguienteLunes = siguienteLunes && fecha.getTime() === siguienteLunes.getTime();
        const esSiguienteMartes = siguienteMartes && fecha.getTime() === siguienteMartes.getTime();
        const bloqueadoPorReglaViernesSabadoDomingo = esSiguienteLunes || esSiguienteMartes;
        
        const fechaStr = fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0') + '-' + String(fecha.getDate()).padStart(2, '0');
        const diaNumero = fecha.getDate();
        const mesNombre = fecha.toLocaleDateString('es-MX', { month: 'short' });
        
        let deshabilitado = false;
        
        if (esHoy) {
            deshabilitado = true;
        } else if (esFinDeSemana) {
            deshabilitado = true;
        } else if (esAntesDeFechaMinima) {
            deshabilitado = true;
        } else if (bloqueadoPorReglaViernesSabadoDomingo) {
            deshabilitado = true;
            // ⭐ Sin mensaje ni tooltip, solo se deshabilita
        }
        
        const estilo = deshabilitado 
            ? 'background:#f3f4f6; color:#9ca3af; cursor:not-allowed; padding:0.8rem 0.3rem; border-radius:8px; font-size:0.85rem;'
            : 'background:white; color:var(--primary-dark); cursor:pointer; padding:0.8rem 0.3rem; border-radius:8px; border:2px solid #e2e8f0; font-size:0.85rem; transition:all 0.2s;';
        
        const onclick = deshabilitado ? '' : `onclick="seleccionarFechaEntrega('${fechaStr}', '${fecha.toLocaleDateString('es-MX', {weekday:'long', day:'numeric', month:'long', year:'numeric'})}')"`;
        
        html += `
            <div class="${deshabilitado ? 'dia-deshabilitado' : 'dia-disponible'}" style="${estilo}" ${onclick}>
                <div style="font-weight:700; font-size:1rem;">${diaNumero}</div>
                <div style="font-size:0.7rem;">${mesNombre}</div>
            </div>
        `;
    }
    
    html += `</div>`;
    html += `
        <div style="margin-top:1rem; font-size:0.8rem; color:var(--text-gray); text-align:center;">
            ${esDespuesDe540 
                ? '⏰ Son más de las 5:40 pm, por lo que tu pedido requiere 2 días de anticipación.' 
                : '⏰ Pedidos antes de las 5:40 pm requieren 1 día de anticipación.'}
            <br>Sábados y domingos no hay entregas.
        </div>
    `;
    
    container.innerHTML = html;
}

function seleccionarFechaEntrega(fechaISO, fechaTexto) {
    fechaEntregaSeleccionada = { iso: fechaISO, texto: fechaTexto };
    document.getElementById('fechaSeleccionadaTexto').textContent = fechaTexto;
    document.getElementById('fechaSeleccionadaInfo').style.display = 'block';
    document.getElementById('btnContinuarAlPago').disabled = false;
    
    document.querySelectorAll('#calendarioContainer .dia-disponible').forEach(el => {
        el.style.background = 'white';
        el.style.borderColor = '#e2e8f0';
        el.style.color = 'var(--primary-dark)';
    });
    
    const fechaObj = new Date(fechaISO + 'T00:00:00');
    const diaNumero = fechaObj.getDate();
    const mesObjetivo = fechaObj.toLocaleDateString('es-MX', { month: 'short' });
    document.querySelectorAll('#calendarioContainer .dia-disponible').forEach(el => {
        const diaEl = el.querySelector('div:first-child');
        const mesEl = el.querySelector('div:last-child');
        if (diaEl && mesEl && diaEl.textContent === String(diaNumero) && mesEl.textContent === mesObjetivo) {
            el.style.background = '#fef3c7';
            el.style.borderColor = 'var(--accent-orange)';
            el.style.color = 'var(--primary-dark)';
        }
    });
}

function confirmarFechaEntrega() {
    if (!fechaEntregaSeleccionada) return;
    window.fechaEntregaSeleccionada = fechaEntregaSeleccionada;
    cerrarModalFechaEntrega();
    abrirModalPago();
}

// ============================================
// FUNCIONES DE PAGO
// ============================================

function abrirModalPago() {
    const modal = document.getElementById('modalPago');
    modal.classList.add('active');
    
    document.getElementById('modalMensaje').innerHTML = '';
    document.getElementById('modalMensaje').style.display = 'none';
    document.getElementById('formTransferencia').style.display = 'none';
    document.getElementById('formCredito').style.display = 'none';
    
    let total = calcularTotal();
    let montoPago = total;
    let montoCredito = 0;
    let esCreditoParcial = false;
    let infoCredito = null;
    let puedeUsarCredito = false;
    let montoExcedente = 0;
    
    if (clienteCreditoHabilitado) {
        infoCredito = verificarCreditoDisponible();
        infoCreditoCalculado = infoCredito;
        puedeUsarCredito = infoCredito.puedeUsarCredito || false;
        esCreditoParcial = infoCredito.tipo === 'credito_parcial' && infoCredito.excedeLimite;
        montoExcedente = infoCredito.montoExcedente || 0;
        
        if (esCreditoParcial) {
            montoPago = infoCredito.montoExcedente || infoCredito.montoPago;
            montoCredito = infoCredito.montoCredito;
        } else if (infoCredito.tipo === 'credito_total') {
            montoPago = 0;
            montoCredito = total;
            puedeUsarCredito = true;
        } else if (infoCredito.tipo === 'no_habilitado') {
            puedeUsarCredito = false;
            montoPago = total;
            montoCredito = 0;
        }
    }
    
    window._infoCredito = infoCredito;
    window._esCreditoParcial = esCreditoParcial;
    window._montoPago = montoPago;
    window._montoCredito = montoCredito;
    window._puedeUsarCredito = puedeUsarCredito;
    window._montoExcedente = montoExcedente;
    
    document.getElementById('montoTransferencia').textContent = formatoMexicano(total);
    document.getElementById('totalCredito').textContent = formatoMexicano(total);
    
    const btnCredito = document.getElementById('btnCredito');
    if (btnCredito) {
        if (clienteCreditoHabilitado && puedeUsarCredito) {
            btnCredito.style.display = 'block';
            btnCredito.disabled = false;
            btnCredito.title = '';
            btnCredito.style.opacity = '1';
            btnCredito.style.cursor = 'pointer';
        } else {
            btnCredito.style.display = 'block';
            btnCredito.disabled = true;
            if (!clienteCreditoHabilitado) {
                btnCredito.title = 'El crédito no está habilitado para este cliente';
            } else if (!puedeUsarCredito) {
                btnCredito.title = 'No puedes usar crédito. El pago de contado es obligatorio.';
            }
            btnCredito.style.opacity = '0.5';
            btnCredito.style.cursor = 'not-allowed';
        }
    }
    
    requiereFactura = false;
    document.getElementById('facturaNo').classList.add('selected');
    document.getElementById('facturaSi').classList.remove('selected');
    document.getElementById('facturaRazonSocialContainer').style.display = 'none';
    document.getElementById('facturaDatosPreview').style.display = 'none';
    datosFacturaSeleccionados = null;
    
    pagoSeleccionado = null;
    document.querySelectorAll('.opciones-pago button').forEach(b => b.classList.remove('selected'));
    
    if (!clienteCreditoHabilitado || !puedeUsarCredito) {
        seleccionarPago('transferencia');
    }
}

function cerrarModalPago() {
    document.getElementById('modalPago').classList.remove('active');
    document.getElementById('modalMensaje').innerHTML = '';
    document.getElementById('modalMensaje').style.display = 'none';
    document.getElementById('formTransferencia').style.display = 'none';
    document.getElementById('formCredito').style.display = 'none';
    comprobanteBase64 = null;
    comprobanteNombre = null;
    comprobanteTipo = null;
    document.getElementById('fileName').textContent = 'Ningún archivo seleccionado';
    infoCreditoCalculado = null;
    
    window._infoCredito = null;
    window._esCreditoParcial = false;
    window._montoPago = 0;
    window._montoCredito = 0;
    window._puedeUsarCredito = false;
    window._montoExcedente = 0;
}

function seleccionarPago(tipo) {
    pagoSeleccionado = tipo;
    document.querySelectorAll('.opciones-pago button').forEach(b => b.classList.remove('selected'));
    
    document.getElementById('modalMensaje').innerHTML = '';
    document.getElementById('modalMensaje').style.display = 'none';
    
    const formTransferencia = document.getElementById('formTransferencia');
    const formCredito = document.getElementById('formCredito');
    const btnConfirmarCredito = document.getElementById('btnConfirmarCredito');
    const btnConfirmarTransferencia = document.getElementById('btnConfirmarTransferencia');
    
    if (tipo === 'transferencia') {
        document.getElementById('btnTransferencia').classList.add('selected');
        if (formTransferencia) formTransferencia.style.display = 'block';
        if (formCredito) formCredito.style.display = 'none';
        
        const total = calcularTotal();
        document.getElementById('montoTransferencia').textContent = formatoMexicano(total);
        
        if (btnConfirmarCredito) btnConfirmarCredito.style.display = 'none';
        if (btnConfirmarTransferencia) {
            btnConfirmarTransferencia.style.display = 'block';
            btnConfirmarTransferencia.innerHTML = '<i class="fas fa-paper-plane"></i> Confirmar Compra';
        }
        
        validarCamposTransferencia();
        document.getElementById('facturaContainer').style.display = 'block';
        
    } else if (tipo === 'credito') {
        document.getElementById('btnCredito').classList.add('selected');
        if (formCredito) formCredito.style.display = 'block';
        if (formTransferencia) formTransferencia.style.display = 'none';
        
        document.getElementById('facturaContainer').style.display = 'block';
        
        // ⭐ RECALCULAR CRÉDITO EN EL MOMENTO
        const infoCreditoActual = verificarCreditoDisponible();
        infoCreditoCalculado = infoCreditoActual;
        
        const esCreditoParcialActual = infoCreditoActual.tipo === 'credito_parcial' && infoCreditoActual.excedeLimite;
        const montoExcedenteActual = infoCreditoActual.montoExcedente || 0;
        const montoCreditoActual = infoCreditoActual.montoCredito || 0;
        
        // Actualizar variables globales
        window._infoCredito = infoCreditoActual;
        window._esCreditoParcial = esCreditoParcialActual;
        window._montoExcedente = montoExcedenteActual;
        window._montoPago = infoCreditoActual.montoPago || 0;
        window._montoCredito = montoCreditoActual;
        
        if (esCreditoParcialActual && infoCreditoActual.excedeLimite) {
            const mensajeHTML = `
                <div style="background: #fef3c7; padding: 1rem; border-radius: 12px; margin-bottom: 1rem; border: 1px solid #fde68a;">
                    <p style="margin: 0; font-weight: 600; color: #92400e;">
                        ⚠️ Excedes el límite de crédito
                    </p>
                    <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; color: #92400e;">
                        <strong>Monto a pagar (excedente):</strong> ${formatoMexicano(montoExcedenteActual)}
                        <br>
                        <strong>Monto a crédito:</strong> ${formatoMexicano(montoCreditoActual)}
                    </p>
                    <p style="margin: 0.5rem 0 0 0; font-size: 0.85rem; color: #92400e;">
                        Para usar crédito, deberás pagar el excedente de contado.
                        <br>
                        <strong>Completa los datos de transferencia para pagar el excedente y finalizar la compra.</strong>
                    </p>
                </div>
            `;
            document.getElementById('modalMensaje').innerHTML = mensajeHTML;
            document.getElementById('modalMensaje').style.display = 'block';
            
            if (formTransferencia) {
                formTransferencia.style.display = 'block';
                document.getElementById('montoTransferencia').textContent = formatoMexicano(montoExcedenteActual);
            }
            
            if (btnConfirmarTransferencia) btnConfirmarTransferencia.style.display = 'none';
            if (btnConfirmarCredito) {
                btnConfirmarCredito.style.display = 'block';
                btnConfirmarCredito.innerHTML = '<i class="fas fa-university"></i> Pagar Excedente y Finalizar';
                btnConfirmarCredito.disabled = true;
                btnConfirmarCredito.title = 'Completa el número de referencia y sube el comprobante';
                btnConfirmarCredito.style.opacity = '0.5';
                btnConfirmarCredito.style.cursor = 'not-allowed';
                btnConfirmarCredito.className = 'btn-enviar';
            }
            
            validarCamposCreditoParcial();
            
        } else {
            document.getElementById('modalMensaje').innerHTML = '';
            document.getElementById('modalMensaje').style.display = 'none';
            
            if (formTransferencia) {
                formTransferencia.style.display = 'none';
            }
            
            if (btnConfirmarTransferencia) btnConfirmarTransferencia.style.display = 'none';
            if (btnConfirmarCredito) {
                btnConfirmarCredito.style.display = 'block';
                btnConfirmarCredito.innerHTML = '<i class="fas fa-check"></i> Confirmar Crédito';
                btnConfirmarCredito.disabled = false;
                btnConfirmarCredito.title = '';
                btnConfirmarCredito.style.opacity = '1';
                btnConfirmarCredito.style.cursor = 'pointer';
                btnConfirmarCredito.className = 'btn-enviar';
            }
        }
    }
}

function validarCamposTransferencia() {
    const referencia = document.getElementById('referenciaTransferencia').value.trim();
    const archivo = document.getElementById('fileName').textContent;
    const btnConfirmar = document.getElementById('btnConfirmarTransferencia');
    
    if (btnConfirmar) {
        if (referencia && archivo && archivo !== 'Ningún archivo seleccionado') {
            btnConfirmar.disabled = false;
            btnConfirmar.title = '';
            btnConfirmar.style.opacity = '1';
            btnConfirmar.style.cursor = 'pointer';
        } else {
            btnConfirmar.disabled = true;
            btnConfirmar.title = 'Completa el número de referencia y sube el comprobante';
            btnConfirmar.style.opacity = '0.5';
            btnConfirmar.style.cursor = 'not-allowed';
        }
    }
}

function validarCamposCreditoParcial() {
    const referencia = document.getElementById('referenciaTransferencia').value.trim();
    const archivo = document.getElementById('fileName').textContent;
    const btnConfirmar = document.getElementById('btnConfirmarCredito');
    
    if (btnConfirmar) {
        if (referencia && archivo && archivo !== 'Ningún archivo seleccionado') {
            btnConfirmar.disabled = false;
            btnConfirmar.title = '';
            btnConfirmar.style.opacity = '1';
            btnConfirmar.style.cursor = 'pointer';
        } else {
            btnConfirmar.disabled = true;
            btnConfirmar.title = 'Completa el número de referencia y sube el comprobante del excedente';
            btnConfirmar.style.opacity = '0.5';
            btnConfirmar.style.cursor = 'not-allowed';
        }
    }
}

// ============================================
// FUNCIONES PARA CARGAR COMPROBANTES
// ============================================

function cargarComprobante(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64String = e.target.result;
        const base64Limpio = base64String.split(',')[1] || base64String;
        
        comprobanteBase64 = base64Limpio;
        comprobanteNombre = file.name;
        comprobanteTipo = file.type;
        document.getElementById('fileName').textContent = file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
        
        const pagoSeleccionadoActual = pagoSeleccionado;
        if (pagoSeleccionadoActual === 'transferencia') {
            validarCamposTransferencia();
        } else if (pagoSeleccionadoActual === 'credito') {
            const esCreditoParcial = window._esCreditoParcial || false;
            if (esCreditoParcial) {
                validarCamposCreditoParcial();
            }
        }
    };
    reader.readAsDataURL(file);
}

function cargarComprobanteCredito(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64String = e.target.result;
        const base64Limpio = base64String.split(',')[1] || base64String;
        
        comprobanteCreditoBase64 = base64Limpio;
        comprobanteCreditoNombre = file.name;
        document.getElementById('fileNameCredito').textContent = file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
        validarCamposCreditoPendiente();
    };
    reader.readAsDataURL(file);
}

document.addEventListener('DOMContentLoaded', function() {
    const refTransferencia = document.getElementById('referenciaTransferencia');
    if (refTransferencia) {
        refTransferencia.addEventListener('input', function() {
            if (pagoSeleccionado === 'transferencia') {
                validarCamposTransferencia();
            } else if (pagoSeleccionado === 'credito') {
                const esCreditoParcial = window._esCreditoParcial || false;
                if (esCreditoParcial) {
                    validarCamposCreditoParcial();
                }
            }
        });
    }
});

function calcularTotal() {
    let subtotal = 0;
    carrito.forEach(item => {
        const importeBase = item.precio * item.cantidad;
        const descuentoItem = importeBase * (item.descuento / 100);
        subtotal += importeBase - descuentoItem;
    });
    return subtotal + (subtotal * 0.16);
}
// ============================================
// FUNCIÓN PARA GENERAR PDF DEL COMPROBANTE
// ============================================

function generarPDFComprobante(datos) {
    try {
        console.log('📄 Generando PDF del comprobante...');

        const hoy = new Date();
        const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                       'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const fechaFormateada = `${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`;

        let nombreAsesor = "Gabriel";
        if (clienteData && clienteData.asesor) {
            nombreAsesor = clienteData.asesor;
        }

        const tituloDocumento = 'Comprobante de Compra';
        const mensajeFooter = '¡Gracias por su preferencia!';
        const facturaFooter = datos.requiereFactura ? '<p><strong>✅ Factura solicitada</strong></p>' : '';

        let tablaProductos = '';
        datos.productos.forEach(producto => {
            let precioInfo = formatoMexicano(producto.precio);
            
            tablaProductos += `
                <tr>
                    <td>${producto.nombre}</td>
                    <td>${precioInfo}</td>
                    <td>${producto.cantidad}</td>
                    <td>${producto.descuento}%</td>
                    <td>${formatoMexicano(producto.importe)}</td>
                </tr>
            `;
        });

        let infoCreditoHTML = '';
        if (datos.tipoPago === 'Crédito' || datos.tipoPago === 'Crédito Parcial') {
            const diasCredito = datos.diasCredito || 20;
            const anticipo = datos.anticipo || 0;
            const saldoPendiente = datos.saldoPendiente || datos.total;
            let fechaPago = '';
            if (datos.fechaPago) {
                const fechaPagoDate = new Date(datos.fechaPago);
                fechaPago = fechaPagoDate.toLocaleDateString('es-MX');
            }
            
            infoCreditoHTML = `
                <div class="info-credito">
                    <h3>Condiciones de Crédito</h3>
                    <p><strong>Anticipo recibido:</strong> ${formatoMexicano(anticipo)}</p>
                    <p><strong>Saldo pendiente:</strong> ${formatoMexicano(saldoPendiente)}</p>
                    <p><strong>Días de crédito:</strong> ${diasCredito} días</p>
                    ${fechaPago ? `<p><strong>Fecha de pago:</strong> ${fechaPago}</p>` : ''}
                    <p style="font-size: 12px; color: #856404; margin-top: 10px;">
                        ⚠️ El saldo pendiente deberá ser liquidado en la fecha establecida.
                    </p>
                </div>
            `;
        }

        let infoFacturaHTML = '';
        if (datos.requiereFactura && datos.datosFactura) {
            infoFacturaHTML = `
                <div class="info-factura">
                    <h3>Información de Facturación</h3>
                    <p><strong>Solicitud de factura:</strong> ✅ SÍ</p>
                    <p><strong>Folio para factura:</strong> ${datos.folio}</p>
                    <p><strong>Razón Social:</strong> ${datos.datosFactura.razonSocial || '---'}</p>
                    <p><strong>RFC:</strong> ${datos.datosFactura.rfc || '---'}</p>
                    <p style="font-size: 12px; color: #155724; margin-top: 10px;">
                        La factura será procesada según los datos fiscales proporcionados.
                    </p>
                </div>
            `;
        }

        let fechaEntregaHTML = '';
        if (window.fechaEntregaSeleccionada) {
            fechaEntregaHTML = `
                <div style="background:#dcfce7; padding:15px; border-radius:8px; margin:20px 0; border:1px solid #bbf7d0;">
                    <p style="margin:0; color:#16a34a;"><strong>📅 Fecha de entrega programada:</strong> ${window.fechaEntregaSeleccionada.texto}</p>
                </div>
            `;
        }

        let metodoPagoHTML = `<p><strong>Método de pago:</strong> ${datos.tipoPago.toUpperCase()}</p>`;

        const logoUrl = 'https://i.imgur.com/1T3PCYR.png';

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { margin: 0; padding: 0; background: white; font-family: Arial, sans-serif; }
    .container { width: 100%; padding: 30px 40px; background: white; }
    .titulo-empresa { text-align: center; font-size: 20px; font-weight: bold; color: #000000; margin-bottom: 2px; }
    .rfc { text-align: center; font-size: 14px; color: #000000; margin-bottom: 15px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #2a3990; }
    .logo { max-width: 150px; height: auto; }
    .folio { font-size: 18px; font-weight: bold; color: #2a3990; }
    .datos-cliente { margin-bottom: 20px; }
    .datos-cliente h3 { margin-bottom: 10px; color: #2a3990; }
    .datos-cliente p { margin: 3px 0; }
    .info-credito { background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffeaa7; }
    .info-credito h3 { color: #856404; margin-top: 0; }
    .info-factura { background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #c3e6cb; }
    .info-factura h3 { color: #155724; margin-top: 0; }
    table { width: 100%; border-collapse: collapse; margin: 25px 0; font-size: 12px; }
    th { background: #2a3990; color: white; padding: 15px 8px; text-align: left; }
    td { padding: 12px 8px; border-bottom: 1px solid #e0e0e0; }
    .precio-personalizado { background-color: #e8f4fd; font-size: 10px; padding: 2px 5px; border-radius: 3px; margin-left: 5px; }
    .totales { margin-top: 30px; text-align: right; }
    .total-row { font-weight: bold; font-size: 16px; color: #2a3990; }
    .terminos { margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 8px; font-size: 10px; color: #666; }
    .terminos h4 { margin: 0 0 8px 0; color: #2a3990; font-size: 11px; }
    .terminos p { margin: 3px 0; }
    .datos-bancarios { margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 8px; font-size: 12px; color: #333; }
    .datos-bancarios h4 { margin: 0 0 8px 0; color: #2a3990; font-size: 13px; }
    .datos-bancarios p { margin: 3px 0; }
    .footer { margin-top: 40px; padding-top: 20px; font-size: 11px; color: #666; text-align: center; border-top: 1px solid #2a3990; }
    .footer .pro { color: #2a3990; }
    .footer .mx { color: #D4AF37; }
    @page { margin: 0; }
    @media print {
        body { margin: 0; padding: 0; }
        .container { padding: 20px; }
    }
</style>
</head>
<body>
<div class="container">
    
    <div class="titulo-empresa">PROCONSTRUCCIONMX SAS DE CV</div>
    <div class="rfc">RFC: PRO2605135X4</div>
    
    <div class="header">
        <div>
            <img src="${logoUrl}" alt="ProConstrucciónMX" class="logo">
        </div>
        <div style="text-align: right;">
            <p class="folio">${datos.folio}</p>
            <p>${fechaFormateada}</p>
            <p>${tituloDocumento}</p>
        </div>
    </div>
    
    <div class="datos-cliente">
        <h3>Datos del Cliente</h3>
        <p><strong>Nombre:</strong> ${datos.cliente.nombre}</p>
        <p><strong>Código:</strong> ${datos.cliente.codigo}</p>
        <p><strong>Asesor:</strong> ${nombreAsesor}</p>
        ${metodoPagoHTML}
    </div>
    
    ${infoCreditoHTML}
    ${infoFacturaHTML}
    ${fechaEntregaHTML}
    
    <table>
        <thead>
            <tr>
                <th>Producto</th>
                <th>Precio Unit.</th>
                <th>Cantidad</th>
                <th>Descuento</th>
                <th>Importe</th>
            </tr>
        </thead>
        <tbody>
            ${tablaProductos}
        </tbody>
    </table>
    
    <div class="totales">
        <p><strong>Importe base:</strong> ${formatoMexicano(datos.subtotal + (datos.subtotal * 0.16))}</p>
        <p><strong>Descuento aplicado:</strong> -${formatoMexicano((datos.subtotal + (datos.subtotal * 0.16)) - datos.total)}</p>
        <p><strong>Subtotal:</strong> ${formatoMexicano(datos.subtotal)}</p>
        <p><strong>IVA (16%):</strong> ${formatoMexicano(datos.iva)}</p>
        <p class="total-row"><strong>Total a pagar:</strong> ${formatoMexicano(datos.total)}</p>
    </div>
    
    <div class="terminos">
        <h4>Condiciones comerciales</h4>
        <p>Precios en moneda nacional.</p>
        <p>Condiciones de pago: 100% al solicitar el material</p>
        <p>Formas de pago: Transferencias Bancarias.</p>
        <p>Los precios están sujetos a cambios sin previo aviso.</p>
        <p>La entrega de productos se realiza a pie de camión, no incluye maniobras.</p>
        <p><strong>Vigencia de la cotización:</strong> cambios sin previo aviso.</p>
        <p>El cliente es responsable de verificar los productos al momento de la entrega, ya que una vez entregada y firmada la hoja de entrega, no se aceptarán cambios o devoluciones en productos dañados o incompletos.</p>
        <p>Los cambios y devoluciones solo son válidos en productos con daño de fábrica.</p>
        <p>Los productos que lleguen dañados deben reportarse de inmediato o no permitir la descarga, ya que después no serán válidos los cambios o devoluciones.</p>
    </div>
    
    <div class="datos-bancarios">
        <h4>Datos bancarios para depósitos</h4>
        <p><strong>PROCONSTRUCCIONMX SAS DE CV</strong></p>
        <p><strong>BANCO:</strong> BBVA</p>
        <p><strong>NÚMERO DE CUENTA:</strong> 0127744064</p>
        <p><strong>CUENTA CLABE:</strong> 012180001277440643</p>
    </div>
    
    <div class="footer">
        <p><strong><span class="pro">ProConstrucción</span><span class="mx">MX</span></strong></p>
        <p>📧 ventas@proconstruccionmx.com</p>
        <p>${mensajeFooter}</p>
        ${facturaFooter}
    </div>
    
</div>
</body>
</html>`;

        const ventana = window.open('', '_blank', 'width=800,height=600');
        if (ventana) {
            ventana.document.write(htmlContent);
            ventana.document.close();
            ventana.focus();
            
            setTimeout(() => {
                ventana.print();
            }, 1000);
            
            setTimeout(() => {
                ventana.close();
            }, 5000);
        } else {
            const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Comprobante_${datos.folio}.html`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            mostrarNotificacion('⚠️ No se pudo abrir la ventana de impresión. Se descargó el archivo HTML.');
        }
        
        console.log('✅ PDF del comprobante generado');
        return true;
    } catch (error) {
        console.error('❌ Error al generar PDF:', error);
        mostrarNotificacion('❌ Error al generar el comprobante. Intenta de nuevo.');
        return false;
    }
}

// ============================================
// ENVIAR CORREO CON ADJUNTO (Fase 0.5)
// Ahora pasa por el Worker (/enviarCorreoVentas), no directo a Apps Script.
// ============================================
async function enviarCorreoConAdjuntoAppsScript(datos) {
    try {
        console.log('📧 Enviando correo con adjunto vía Worker...');
        console.log('📧 esLiquidacionCredito:', datos.esLiquidacionCredito);
        
        let productosTexto = '';
        if (datos.productos && datos.productos.length > 0) {
            productosTexto = 'Cant. | Producto | Precio | Dto.% | Importe\n';
            productosTexto += '-----|---------|--------|-------|--------\n';
            datos.productos.forEach(p => {
                const cantidad = p.cantidad || 0;
                const nombre = p.nombre || 'Sin nombre';
                const precio = Number(p.precio || 0).toFixed(2);
                const descuento = Number(p.descuento || 0);
                const importe = Number(p.importe || 0).toFixed(2);
                productosTexto += `${cantidad} | ${nombre} | $${precio} | ${descuento}% | $${importe}\n`;
            });
        } else {
            productosTexto = 'No hay productos en esta venta.';
        }
        
        let asunto = '';
        if (datos.esLiquidacionCredito) {
            asunto = `PAGO DE CREDITO - ${datos.folio} - ${datos.cliente.nombre}`;
        } else {
            asunto = `NUEVA VENTA WEB - ${datos.folio} - ${datos.cliente.nombre}`;
        }
        
        const payload = {
            asunto: asunto,
            folio: datos.folio || 'Sin folio',
            fecha: datos.fecha ? datos.fecha.toLocaleString('es-MX') : new Date().toLocaleString('es-MX'),
            cliente_nombre: datos.cliente ? datos.cliente.nombre : 'Sin nombre',
            tipo_pago: datos.tipoPago || 'No especificado',
            referencia: datos.referencia || 'N/A',
            comprobante_nombre: datos.comprobanteNombre || 'No adjunto',
            comprobanteBase64: datos.comprobante || null,
            comprobanteTipo: datos.comprobanteTipo || 'image/jpeg',
            productos_texto: productosTexto,
            subtotal: Number(datos.subtotal || 0).toFixed(2),
            iva: Number(datos.iva || 0).toFixed(2),
            total: Number(datos.total || 0).toFixed(2),
                        // ⭐ Fase 1B: Datos de crédito para el correo
            credito_pendiente: Number(datos.montoCredito || datos.creditoPendiente || 0).toFixed(2),
            monto_pago_excedente: Number(datos.anticipo || datos.montoPago || 0).toFixed(2),
            es_credito_parcial: datos.esCreditoParcial || false,
            dias_credito: datos.diasCredito || 0,
            fecha_pago: datos.fechaPago ? (typeof datos.fechaPago === 'string' ? datos.fechaPago : datos.fechaPago.toLocaleDateString('es-MX')) : '',
            anio: new Date().getFullYear(),
            direccion_nombre: datos.nombreDireccion || 'Sin nombre',
            direccion_calle: datos.direccion ? datos.direccion.calle : '',
            direccion_colonia: datos.direccion ? datos.direccion.colonia : '',
            direccion_alcaldia: datos.direccion ? datos.direccion.alcaldia : '',
            direccion_estado: datos.direccion ? datos.direccion.estado : '',
            direccion_cp: datos.direccion ? datos.direccion.cp : '',
            direccion_telefono: datos.direccion ? datos.direccion.telefono : '',
            direccion_recibe: datos.direccion ? datos.direccion.nombreRecibe : '',
            fecha_entrega: window.fechaEntregaSeleccionada ? window.fechaEntregaSeleccionada.texto : '',
            requiere_factura: datos.requiereFactura || false,
            factura_razon_social: datos.datosFactura ? datos.datosFactura.razonSocial : '',
            factura_rfc: datos.datosFactura ? datos.datosFactura.rfc : '',
            esLiquidacionCredito: datos.esLiquidacionCredito || false,
            idVentaOriginal: datos.idVentaOriginal || null
        };
        
        console.log('📤 Enviando a Worker /enviarCorreoVentas');
        
        const response = await fetchAutenticado(`${WORKER_URL}/enviarCorreoVentas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Correo enviado correctamente vía Worker');
            return { success: true };
        } else {
            console.error('❌ El Worker rechazó el envío del correo:', result.error);
            return { success: false, error: result.error };
        }
        
    } catch (error) {
        console.error('❌ Error al enviar correo con adjunto:', error);
        return { success: false, error: error.toString() };
    }
}

// ============================================
// PROCESAMIENTO DE PAGOS
// ============================================

// ============================================
// PROCESAR PAGO POR TRANSFERENCIA (Fase 1A)
// Ahora llama a /crearPedido con solo [{clave, cantidad}].
// El servidor recalcula precios, descuentos, peso y total.
// ============================================
async function procesarPagoTransferencia() {
    const referencia = document.getElementById('referenciaTransferencia').value.trim();
    
    if (!referencia) {
        mostrarMensajeModal('error', '⚠️ El número de referencia o folio de transferencia es obligatorio.');
        return;
    }
    
    if (!comprobanteBase64) {
        mostrarMensajeModal('error', '⚠️ Por favor, sube el comprobante de transferencia.');
        return;
    }
    
    if (!window.datosEnvio || !window.datosEnvio.mapsUrl || window.datosEnvio.mapsUrl === 'No proporcionado') {
        mostrarMensajeModal('error', '⚠️ La URL de Google Maps es obligatoria. Por favor, proporciona la ubicación exacta.');
        return;
    }
    
    if (requiereFactura && !datosFacturaSeleccionados) {
        mostrarMensajeModal('error', '⚠️ Por favor, selecciona una razón social para facturar.');
        return;
    }
    
    const btn = document.getElementById('btnConfirmarTransferencia');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="loading-spinner"></span> Procesando...';
    }
    
    try {
        // 1. Construir items: SOLO clave y cantidad
        const items = carrito.map(item => ({
            clave: item.clave,
            cantidad: item.cantidad
        }));
        
        // 2. Construir body para /crearPedido
        const body = {
            items: items,
            metodoPago: 'Transferencia',
            nombreDireccion: window.datosEnvio ? window.datosEnvio.nombreDireccion || 'Sin nombre' : 'Sin nombre',
            requiereFactura: requiereFactura,
            razonSocialFactura: datosFacturaSeleccionados ? datosFacturaSeleccionados.razonSocial : '',
            fechaEntrega: window.fechaEntregaSeleccionada ? window.fechaEntregaSeleccionada.iso : ''
        };
        
        console.log('📤 Enviando a /crearPedido:', body);
        
        // 3. Llamar al Worker
        const response = await fetchAutenticado(`${WORKER_URL}/crearPedido`, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(body)
        });
        
        const result = await response.json();
        console.log('📥 Respuesta de /crearPedido:', result);
        
        // 4. Verificar resultado
        if (!result.success) {
            mostrarMensajeModal('error', '❌ ' + (result.error || 'Error al crear el pedido.'));
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-paper-plane"></i> Confirmar Compra';
            }
            return;
        }
        
        // 5. Construir datosVenta con los datos del SERVIDOR
        //    (para el PDF, el correo y el mensaje de éxito)
        const productosParaPDF = result.productos.map(p => ({
            nombre: p.nombre,
            cantidad: p.cantidad,
            precio: p.precio,
            descuento: p.descuento,
            importe: p.importe
        }));
        
        const datosVenta = {
            folio: result.folio,
            fecha: new Date(),
            cliente: result.cliente,
            direccion: window.datosEnvio || null,
            productos: productosParaPDF,
            total: result.total,
            subtotal: result.subtotal,
            iva: result.iva,
            tipoPago: 'Transferencia',
            referencia: referencia,
            comprobante: comprobanteBase64,
            comprobanteNombre: comprobanteNombre,
            comprobanteTipo: comprobanteTipo,
            sucursal: SUCURSAL_WEB,
            nombreDireccion: window.datosEnvio ? window.datosEnvio.nombreDireccion || 'Sin nombre' : 'Sin nombre',
            requiereFactura: requiereFactura,
            datosFactura: datosFacturaSeleccionados,
            montoPago: result.total,
            montoCredito: 0,
            estadoPago: result.estadoPago || 'Validando pago',
            esCreditoParcial: false,
            diasCredito: 0,
            fechaPago: null,
            saldoPendiente: 0,
            anticipo: result.total
        };
        
        // 6. Enviar correo con adjunto (vía Worker)
        await enviarCorreoConAdjuntoAppsScript(datosVenta);
        
        // 7. Generar PDF del comprobante
        generarPDFComprobante(datosVenta);
        
        // 8. Mostrar mensaje de éxito
        let mensajeExito = `
            ✅ ¡Compra realizada con éxito!<br>
            <strong>Folio:</strong> ${result.folio}<br>
            <strong>Total:</strong> ${formatoMexicano(result.total)}<br>
            <strong>Método:</strong> Transferencia<br>
            <strong>Referencia:</strong> ${referencia}<br>
        `;
        
        if (window.fechaEntregaSeleccionada) {
            mensajeExito += `<strong>📅 Entrega programada:</strong> ${window.fechaEntregaSeleccionada.texto}<br>`;
        }
        
        if (requiereFactura) {
            mensajeExito += `<strong>Factura:</strong> Sí - ${datosFacturaSeleccionados ? datosFacturaSeleccionados.razonSocial : 'N/A'}<br>`;
        } else {
            mensajeExito += `<strong>Factura:</strong> No<br>`;
        }
        
        mensajeExito += `<br>Se ha descargado el comprobante en formato PDF.<br>Se ha enviado un correo a ventas@proconstruccionmx.com con los detalles.`;
        
        mostrarMensajeModal('exito', mensajeExito);
        
        // 9. Limpiar carrito y estado
        carrito = [];
        renderizarCarrito();
        window.datosEnvio = null;
        window.fechaEntregaSeleccionada = null;
        window._infoCredito = null;
        window._esCreditoParcial = false;
        window._montoPago = 0;
        window._montoCredito = 0;
        window._puedeUsarCredito = false;
        window._montoExcedente = 0;
        infoCreditoCalculado = null;
        
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Confirmar Compra';
        }
        
        // 10. Recargar historial después de 8 segundos
        setTimeout(() => {
            cerrarModalPago();
            cargarHistorialCompras();
        }, 8000);
        
    } catch (error) {
        console.error('Error al procesar pago:', error);
        mostrarMensajeModal('error', '❌ Error al procesar el pago. Por favor, intenta de nuevo o contacta a tu asesor.');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Confirmar Compra';
        }
    }
}

// ============================================
// PROCESAR PAGO A CRÉDITO (Fase 1B)
// Ahora llama a /crearPedido con metodoPago: 'Credito'.
// El servidor recalcula todo (crédito total o parcial).
// ============================================
async function procesarPagoCredito() {
    const total = calcularTotal();
    
    // Validaciones previas
    if (!window.datosEnvio || !window.datosEnvio.mapsUrl || window.datosEnvio.mapsUrl === 'No proporcionado') {
        mostrarMensajeModal('error', '⚠️ La URL de Google Maps es obligatoria. Por favor, proporciona la ubicación exacta.');
        return;
    }
    
    if (requiereFactura && !datosFacturaSeleccionados) {
        mostrarMensajeModal('error', '⚠️ Por favor, selecciona una razón social para facturar.');
        return;
    }
    
    // Para crédito parcial, validar referencia y comprobante del excedente
    const esCreditoParcial = window._esCreditoParcial || false;
    const montoExcedente = window._montoExcedente || 0;
    
    if (esCreditoParcial && montoExcedente > 0) {
        const referencia = document.getElementById('referenciaTransferencia').value.trim();
        if (!referencia) {
            mostrarMensajeModal('error', '⚠️ Para el crédito parcial, debes ingresar el número de referencia o folio de transferencia del excedente.');
            return;
        }
        if (!comprobanteBase64) {
            mostrarMensajeModal('error', '⚠️ Para el crédito parcial, debes subir el comprobante de transferencia del excedente.');
            return;
        }
    }
    
    const btn = document.getElementById('btnConfirmarCredito');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="loading-spinner"></span> Procesando...';
    }
    
    try {
        // 1. Construir items: SOLO clave y cantidad
        const items = carrito.map(item => ({
            clave: item.clave,
            cantidad: item.cantidad
        }));
        
        // 2. Construir body para /crearPedido
        const body = {
            items: items,
            metodoPago: 'Credito',
            nombreDireccion: window.datosEnvio ? window.datosEnvio.nombreDireccion || 'Sin nombre' : 'Sin nombre',
            requiereFactura: requiereFactura,
            razonSocialFactura: datosFacturaSeleccionados ? datosFacturaSeleccionados.razonSocial : '',
            fechaEntrega: window.fechaEntregaSeleccionada ? window.fechaEntregaSeleccionada.iso : ''
        };
        
        console.log('📤 Enviando a /crearPedido (Crédito):', body);
        
        // 3. Llamar al Worker
        const response = await fetchAutenticado(`${WORKER_URL}/crearPedido`, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(body)
        });
        
        const result = await response.json();
        console.log('📥 Respuesta de /crearPedido (Crédito):', result);
        
        // 4. Verificar resultado
        if (!result.success) {
            mostrarMensajeModal('error', '❌ ' + (result.error || 'Error al crear el pedido a crédito.'));
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-check"></i> Confirmar Crédito';
            }
            return;
        }
        
        // 5. Construir datosVenta con los datos del SERVIDOR
        const productosParaPDF = result.productos.map(p => ({
            nombre: p.nombre,
            cantidad: p.cantidad,
            precio: p.precio,
            descuento: p.descuento,
            importe: p.importe
        }));
        
        const datosVenta = {
            folio: result.folio,
            fecha: new Date(),
            cliente: result.cliente,
            direccion: window.datosEnvio || null,
            productos: productosParaPDF,
            total: result.total,
            subtotal: result.subtotal,
            iva: result.iva,
            tipoPago: result.esCreditoParcial ? 'Crédito Parcial' : 'Crédito',
            diasCredito: result.diasCredito || DIAS_CREDITO_FIJO,
            anticipo: result.esCreditoParcial ? result.montoPagoExcedente : 0,
            saldoPendiente: result.creditoPendiente,
            fechaPago: result.fechaPago ? new Date(result.fechaPago) : null,
            sucursal: SUCURSAL_WEB,
            nombreDireccion: window.datosEnvio ? window.datosEnvio.nombreDireccion || 'Sin nombre' : 'Sin nombre',
            requiereFactura: requiereFactura,
            datosFactura: datosFacturaSeleccionados,
            montoPago: result.esCreditoParcial ? result.montoPagoExcedente : 0,
            montoCredito: result.creditoPendiente,
            estadoPago: result.estadoPago,
            esCreditoParcial: result.esCreditoParcial,
            referencia: esCreditoParcial ? document.getElementById('referenciaTransferencia').value.trim() : 'CRÉDITO',
            comprobante: esCreditoParcial ? comprobanteBase64 : null,
            comprobanteNombre: esCreditoParcial ? comprobanteNombre : null,
            comprobanteTipo: esCreditoParcial ? comprobanteTipo : null
        };
        
        // 6. Generar token de confirmación de crédito (se enviará al servidor)
        try {
            const tokenConfirmacion = generarTokenConfirmacion();
            const fechaCompraStr = new Date().toLocaleDateString('es-MX', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
            const fechaPagoStr = result.fechaPago || '';
            
            const productosParaEmail = productosParaPDF.map(p => ({
                nombre: p.nombre,
                cantidad: p.cantidad,
                importe: p.importe
            }));
            
            const responseToken = await fetchAutenticado(`${WORKER_URL}/guardarTokenCompraCredito`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify({
                    folio: result.folio,
                    codigoCliente: clienteData.codigo,
                    token: tokenConfirmacion,
                    email: clienteData.correo,
                    nombre: clienteData.nombre,
                    fechaCompra: fechaCompraStr,
                    total: result.total,
                    productos: productosParaEmail,
                    fechaPago: fechaPagoStr,
                    diasCredito: result.diasCredito || DIAS_CREDITO_FIJO,
                    anticipo: result.esCreditoParcial ? result.montoPagoExcedente : 0,
                    saldoPendiente: result.creditoPendiente
                })
            });
            
            const resultToken = await responseToken.json();
            console.log('📧 Resultado guardarTokenCompraCredito:', resultToken);
            
            if (resultToken.correoEnviado) {
                console.log('✅ Correo de confirmación de crédito enviado al cliente');
            } else {
                console.warn('⚠️ El correo de confirmación no se pudo enviar, pero la venta fue registrada');
            }
        } catch (tokenError) {
            console.error('⚠️ Error al generar token de confirmación (no bloquea la venta):', tokenError);
        }
        
        // 7. Enviar correo con adjunto (vía Worker)
        await enviarCorreoConAdjuntoAppsScript(datosVenta);
        
        // 8. Generar PDF del comprobante
        generarPDFComprobante(datosVenta);
        
        // 9. Mostrar mensaje de éxito
        let mensajeExito = `
            ✅ ¡Crédito ${result.esCreditoParcial ? 'parcial' : ''} aprobado!<br>
            <strong>Folio:</strong> ${result.folio}<br>
            <strong>Total:</strong> ${formatoMexicano(result.total)}<br>
            <strong>Días de crédito:</strong> ${result.diasCredito || DIAS_CREDITO_FIJO} días fijos<br>
            <strong>Fecha de pago:</strong> ${result.fechaPago || 'No definida'}<br>
        `;
        
        if (window.fechaEntregaSeleccionada) {
            mensajeExito += `<strong>📅 Entrega programada:</strong> ${window.fechaEntregaSeleccionada.texto}<br>`;
        }
        
        if (result.esCreditoParcial) {
            mensajeExito += `
                <strong>Monto pagado (excedente):</strong> ${formatoMexicano(result.montoPagoExcedente)}<br>
                <strong>Monto a crédito:</strong> ${formatoMexicano(result.creditoPendiente)}<br>
                <strong>Referencia excedente:</strong> ${document.getElementById('referenciaTransferencia').value.trim() || 'N/A'}<br>
                <span style="color:#92400e;font-size:0.9rem;">⚠️ El saldo a crédito deberá ser liquidado en ${result.diasCredito || DIAS_CREDITO_FIJO} días.</span><br>
            `;
        }
        
        if (requiereFactura) {
            mensajeExito += `<strong>Factura:</strong> Sí - ${datosFacturaSeleccionados ? datosFacturaSeleccionados.razonSocial : 'N/A'}<br>`;
        } else {
            mensajeExito += `<strong>Factura:</strong> No<br>`;
        }
        
        mensajeExito += `<br>Se ha descargado el comprobante en formato PDF.<br>Se ha enviado un correo a ventas@proconstruccionmx.com con los detalles.`;
        
        if (result.esCreditoParcial) {
            mensajeExito += `<br><span style="color:#92400e;font-size:0.9rem;">✅ El excedente ha sido pagado. El resto queda a crédito.</span>`;
        }
        
        mostrarMensajeModal('exito', mensajeExito);
        
        // 10. Limpiar carrito y estado
        carrito = [];
        renderizarCarrito();
        window.datosEnvio = null;
        window.fechaEntregaSeleccionada = null;
        window._infoCredito = null;
        window._esCreditoParcial = false;
        window._montoPago = 0;
        window._montoCredito = 0;
        window._puedeUsarCredito = false;
        window._montoExcedente = 0;
        infoCreditoCalculado = null;
        
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Confirmar Crédito';
        }
        
        // 11. Recargar historial después de 8 segundos
        setTimeout(() => {
            cerrarModalPago();
            cargarHistorialCompras();
        }, 8000);
        
    } catch (error) {
        console.error('Error al procesar crédito:', error);
        mostrarMensajeModal('error', '❌ Error al procesar el crédito. Por favor, intenta de nuevo o contacta a tu asesor.');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Confirmar Crédito';
        }
    }
}

// ============================================
// FUNCIONES PARA GUARDAR EN ESTADÍSTICAS
// ============================================

async function guardarVentaEnEstadisticas(datos) {
    try {
        console.log('📊 Guardando venta en estadísticas...');
        console.log('📊 Tipo de pago:', datos.tipoPago);
        console.log('📊 Monto pago:', datos.montoPago);
        console.log('📊 Monto crédito:', datos.montoCredito);
        console.log('📊 Productos:', datos.productos.length);
        
        const fechaFormateada = datos.fecha.toLocaleString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        for (const producto of datos.productos) {
            let precioCompra = 0;
            let ganancia = 0;
            
            const productoCompleto = productosGlobales.find(p => p.clave === producto.clave);
            if (productoCompleto) {
                precioCompra = productoCompleto.precioCompra || 0;
                const costoTotal = precioCompra * producto.cantidad;
                ganancia = producto.importe - costoTotal;
            }
            
            let creditoPendiente = 0;
            let montoPagado = 0;
            let diasCredito = 0;
            let fechaPago = '';
            
            const esCredito = datos.tipoPago === 'Crédito' || datos.tipoPago === 'Crédito Parcial';
            
            if (esCredito) {
                if (producto._tipo === 'credito') {
                    if (datos.total > 0 && datos.montoCredito > 0) {
                        const proporcion = producto.importe / datos.total;
                        creditoPendiente = datos.montoCredito * proporcion;
                    } else {
                        creditoPendiente = producto.importe;
                    }
                    montoPagado = 0;
                    diasCredito = datos.diasCredito || DIAS_CREDITO_FIJO;
                    fechaPago = datos.fechaPago ? datos.fechaPago.toLocaleDateString('es-MX') : '';
                } else if (producto._tipo === 'pago') {
                    creditoPendiente = 0;
                    montoPagado = producto.importe;
                } else {
                    creditoPendiente = producto.importe;
                    montoPagado = 0;
                    diasCredito = datos.diasCredito || DIAS_CREDITO_FIJO;
                    fechaPago = datos.fechaPago ? datos.fechaPago.toLocaleDateString('es-MX') : '';
                }
            } else {
                creditoPendiente = 0;
                montoPagado = 0;
                diasCredito = 0;
                fechaPago = '';
            }
            
            const filaProducto = [
                fechaFormateada,
                datos.folio,
                producto.nombre,
                producto.cantidad,
                producto.importe.toFixed(2),
                ganancia.toFixed(2),
                '',
                creditoPendiente.toFixed(2),
                montoPagado.toFixed(2),
                diasCredito,
                fechaPago,
                datos.sucursal
            ];
            
            console.log(`📝 Guardando producto: ${producto.nombre}, crédito: ${creditoPendiente}, pagado: ${montoPagado}, días: ${diasCredito}, fechaPago: ${fechaPago}`);
            await guardarFilaGoogleSheets(HOJA_EST_PRODUCTOS, filaProducto);
        }
        
        const facturaTexto = datos.requiereFactura ? 'SÍ' : 'NO';
        const formaPago = datos.tipoPago === 'Transferencia' ? 'Transferencia bancaria' :
                          datos.tipoPago === 'Crédito' ? 'Crédito' :
                          datos.tipoPago === 'Crédito Parcial' ? 'Crédito parcial' : datos.tipoPago;
        const tipoPago = datos.tipoPago === 'Crédito' || datos.tipoPago === 'Crédito Parcial' ? 'Pago diferido en parcialidades' : 'Pago en una sola exhibición';
        const estadoPago = datos.estadoPago || (datos.tipoPago === 'Crédito' ? 'En preparación' : 'Validando pago');
        const nombreDireccion = datos.nombreDireccion || 'Sin nombre';
        
        let razonSocialFactura = '';
        if (datos.requiereFactura && datos.datosFactura) {
            razonSocialFactura = datos.datosFactura.razonSocial || '';
        }
        
        let creditoPendienteTotal = datos.montoCredito || 0;
        let montoPagadoTotal = datos.montoPago || 0;
        
        if (datos.tipoPago === 'Transferencia') {
            creditoPendienteTotal = 0;
            montoPagadoTotal = 0;
        }
        
        if (datos.tipoPago === 'Crédito' && !datos.esCreditoParcial) {
            creditoPendienteTotal = datos.total;
            montoPagadoTotal = 0;
        }
        
        if (datos.esLiquidacionCredito) {
            console.log('📝 Es liquidación de crédito, no se guarda en Clientes');
            console.log('✅ Liquidación de crédito registrada correctamente');
            return;
        }
        
        let fechaEntregaFormateada = '';
        if (window.fechaEntregaSeleccionada && window.fechaEntregaSeleccionada.iso) {
            const [y, m, d] = window.fechaEntregaSeleccionada.iso.split('-');
            fechaEntregaFormateada = `${d}/${m}/${y}`;
        }
        
        const filaCliente = [
            fechaFormateada,
            datos.folio,
            datos.cliente.codigo,
            datos.cliente.nombre,
            datos.total.toFixed(2),
            creditoPendienteTotal.toFixed(2),
            montoPagadoTotal.toFixed(2),
            facturaTexto,
            datos.sucursal,
            formaPago,
            tipoPago,
            '',
            estadoPago,
            nombreDireccion,
            razonSocialFactura,
            '',
            fechaEntregaFormateada
        ];
        
        console.log(`📝 Guardando cliente: ${datos.cliente.nombre}, total: ${datos.total}, crédito: ${creditoPendienteTotal}, pagado: ${montoPagadoTotal}, entrega: ${fechaEntregaFormateada}`);
        await guardarFilaGoogleSheets(HOJA_EST_CLIENTES, filaCliente);
        
        console.log('✅ Venta guardada en estadísticas correctamente');
        
    } catch (error) {
        console.error('❌ Error al guardar en estadísticas:', error);
        throw error;
    }
}

// ============================================
// FUNCIONES PARA "MIS COMPRAS"
// ============================================

// ============================================
// CARGA DE HISTORIAL DE COMPRAS (Fase 0.3)
// ============================================
async function cargarHistorialCompras() {
    try {
        console.log('📥 Cargando historial de compras...');
        
        // 1. Cargar ventas (cabecera) del cliente
        const urlClientes = `${WORKER_URL}/leer?tipo=estadisticas-clientes`;
        const responseClientes = await fetchAutenticado(urlClientes);
        const dataClientes = await responseClientes.json();
        
        if (!dataClientes.success) {
            console.error('❌ No se pudieron cargar las ventas:', dataClientes.error);
            renderizarHistorialVacio();
            return;
        }
        
        const ventasDelCliente = dataClientes.ventas || [];
        console.log(`📦 Ventas encontradas: ${ventasDelCliente.length}`);
        
        if (ventasDelCliente.length === 0) {
            renderizarHistorialVacio();
            return;
        }
        
        // 2. Cargar líneas de producto del cliente
        const urlProductos = `${WORKER_URL}/leer?tipo=estadisticas-productos`;
        const responseProductos = await fetchAutenticado(urlProductos);
        const dataProductos = await responseProductos.json();
        
        if (!dataProductos.success) {
            console.error('❌ No se pudieron cargar los productos:', dataProductos.error);
            renderizarHistorialVacio();
            return;
        }
        
        const productosDelCliente = dataProductos.productos || [];
        console.log(`📦 Líneas de producto encontradas: ${productosDelCliente.length}`);
        
        // 3. Agrupar productos por folio
        const productosPorVenta = new Map();
        const contadorProductos = new Map();
        
        productosDelCliente.forEach(p => {
            const folio = p.folio;
            
            if (!productosPorVenta.has(folio)) {
                productosPorVenta.set(folio, []);
            }
            productosPorVenta.get(folio).push({
                nombre: p.producto,
                cantidad: p.cantidad,
                importe: p.importe
            });
            
            // Contador para "productos más comprados"
            if (contadorProductos.has(p.producto)) {
                const data = contadorProductos.get(p.producto);
                data.cantidad += p.cantidad;
                data.veces++;
                data.totalImporte += p.importe;
            } else {
                contadorProductos.set(p.producto, {
                    nombre: p.producto,
                    cantidad: p.cantidad,
                    veces: 1,
                    totalImporte: p.importe
                });
            }
        });
        
        // 4. Construir el array de historialVentas
        historialVentas = [];
        
        ventasDelCliente.forEach(v => {
            const folio = v.folio;
            const productos = productosPorVenta.get(folio) || [];
            const subtotal = productos.reduce((sum, p) => sum + p.importe, 0);
            
            // Parsear la fecha
            const fechaObj = parseFechaGoogleSheets(v.fecha);
            
            // Procesar fecha de entrega (columna R)
            let fechaEntregaStr = '';
            if (v.fechaEntrega) {
                if (typeof v.fechaEntrega === 'object' && v.fechaEntrega.getTime) {
                    try {
                        fechaEntregaStr = v.fechaEntrega.toLocaleDateString('es-MX', {
                            day: '2-digit', month: '2-digit', year: 'numeric'
                        });
                    } catch (e) {}
                } else if (typeof v.fechaEntrega === 'string' && v.fechaEntrega.includes('Date(')) {
                    const nums = v.fechaEntrega.replace('Date(', '').replace(')', '').split(',').map(n => parseInt(n));
                    if (nums.length >= 3 && !isNaN(nums[0])) {
                        fechaEntregaStr = String(nums[2]).padStart(2,'0') + '/' + 
                                           String(nums[1]+1).padStart(2,'0') + '/' + 
                                           nums[0];
                    }
                } else if (typeof v.fechaEntrega === 'string' && v.fechaEntrega.trim() !== '') {
                    fechaEntregaStr = v.fechaEntrega.trim();
                }
            }
            
            const estatusPago = String(v.estatusPago || '').trim();
            const validado = estatusPago.toUpperCase() === 'VALIDADO';
            
            // Buscar días de crédito y fecha de pago en los productos
            let diasCreditoVenta = 0;
            let fechaPagoVenta = null;
            productosDelCliente.forEach(p => {
                if (p.folio === folio) {
                    if (p.diasCredito && p.diasCredito > 0) diasCreditoVenta = p.diasCredito;
                    if (p.fechaPago && !fechaPagoVenta) fechaPagoVenta = p.fechaPago;
                }
            });
            
            historialVentas.push({
                idVenta: folio,
                fecha: v.fecha,
                fechaObj: fechaObj,
                total: v.total,
                estado: v.estatus || 'Validando pago',
                codigoCliente: v.codigoCliente,
                tipoPago: v.formaPago || v.tipoPago || '',
                saldoPendiente: v.creditoPendiente,
                montoPagado: v.montoPagado,
                anticipo: v.montoPagado,
                estatusPago: estatusPago,
                validado: validado,
                fechaEntrega: fechaEntregaStr,
                productos: productos,
                subtotal: subtotal,
                iva: subtotal * 0.16,
                totalConIva: subtotal * 1.16,
                fechaPago: fechaPagoVenta,
                diasCredito: diasCreditoVenta
            });
        });
        
        // 5. Ordenar por fecha descendente
        historialVentas.sort((a, b) => {
            const fechaA = a.fechaObj || parseFechaGoogleSheets(a.fecha);
            const fechaB = b.fechaObj || parseFechaGoogleSheets(b.fecha);
            if (!fechaA && !fechaB) return 0;
            if (!fechaA) return 1;
            if (!fechaB) return -1;
            return fechaB - fechaA;
        });
        
        // 6. Productos más comprados
        productosMasComprados = Array.from(contadorProductos.values());
        productosMasComprados.sort((a, b) => b.totalImporte - a.totalImporte);
        
        console.log(`📦 Historial cargado: ${historialVentas.length} ventas`);
        
        // 7. Poblar el select de años
        const anos = [...new Set(historialVentas.map(v => {
            const fecha = v.fechaObj || parseFechaGoogleSheets(v.fecha);
            return fecha ? fecha.getFullYear() : null;
        }).filter(a => a !== null))];
        
        const anoSelect = document.getElementById('filtroAno');
        if (anoSelect) {
            anoSelect.innerHTML = '<option value="todos">Todos los años</option>';
            anos.sort((a, b) => b - a);
            anos.forEach(ano => {
                const option = document.createElement('option');
                option.value = ano;
                option.textContent = ano;
                anoSelect.appendChild(option);
            });
        }
        
        // 8. Renderizar
        renderizarOrdenes();
        renderizarHistorialCompras();
        renderizarEstadisticasProductos();
        cargarCreditosPendientesConValidacion();
        
    } catch (error) {
        console.error('❌ Error al cargar historial de compras:', error);
        renderizarHistorialVacio();
    }
}

function renderizarOrdenes() {
    const container = document.getElementById('ordenesContent');
    if (!container) return;
    
    const hoy = new Date();
    const hace15Dias = new Date(hoy);
    hace15Dias.setDate(hace15Dias.getDate() - 15);
    
    const ordenesRecientes = historialVentas.filter(v => {
        const fecha = v.fechaObj || parseFechaGoogleSheets(v.fecha);
        if (!fecha) return false;
        return fecha >= hace15Dias;
    });
    
    if (ordenesRecientes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clock"></i>
                <h4>Sin órdenes recientes</h4>
                <p>No tienes compras en los últimos 15 días.</p>
            </div>
        `;
        return;
    }
    
    ordenesRecientes.sort((a, b) => {
        const fechaA = a.fechaObj || parseFechaGoogleSheets(a.fecha);
        const fechaB = b.fechaObj || parseFechaGoogleSheets(b.fecha);
        if (!fechaA && !fechaB) return 0;
        if (!fechaA) return 1;
        if (!fechaB) return -1;
        return fechaB - fechaA;
    });
    
    const estadoColors = {
        'Validando pago': '#f59e0b',
        'En preparación': '#3b82f6',
        'En camino': '#8b5cf6',
        'Entregado': '#10b981'
    };
    
    const estadoIcons = {
        'Validando pago': 'fa-clock',
        'En preparación': 'fa-box',
        'En camino': 'fa-truck',
        'Entregado': 'fa-check-circle'
    };
    
    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:0.5rem;">
            <h3 style="margin:0; color:var(--primary-dark);">📦 Tus Órdenes Recientes</h3>
            <span style="font-size:0.85rem; color:var(--text-gray);">Últimos 15 días</span>
        </div>
        <div style="position:relative; padding-left: 2rem;">
    `;
    
    ordenesRecientes.forEach((venta, index) => {
        const estado = venta.estado || 'Validando pago';
        const color = estadoColors[estado] || '#6b7280';
        const icon = estadoIcons[estado] || 'fa-circle';
        const fecha = venta.fechaObj || parseFechaGoogleSheets(venta.fecha);
        const fechaFormateada = fecha ? fecha.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }) : 'Fecha no disponible';
        
        if (index < ordenesRecientes.length - 1) {
            html += `<div style="position:absolute; left:10px; top:40px; bottom:0; width:2px; background:#e5e7eb;"></div>`;
        }
        
        html += `
            <div style="position:relative; margin-bottom: 2rem; padding-left: 1.5rem; cursor:pointer;" onclick="verDetalleVenta('${venta.idVenta}')">
                <div style="position:absolute; left:-2px; top:5px; width:20px; height:20px; border-radius:50%; background:${color}; display:flex; align-items:center; justify-content:center; z-index:1; box-shadow: 0 0 0 4px rgba(255,255,255,0.8);">
                    <i class="fas ${icon}" style="color:white; font-size:10px;"></i>
                </div>
                <div style="background:white; border-radius:12px; padding:1.2rem 1.5rem; box-shadow:0 2px 8px rgba(0,0,0,0.04); border:1px solid #f3f4f6; transition:all 0.3s;" 
                     onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)';" 
                     onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.04)';">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
                        <div>
                            <span style="font-weight:700; color:var(--primary-dark); font-size:1.1rem;">${venta.idVenta}</span>
                            <span style="font-size:0.85rem; color:var(--text-gray); margin-left:0.5rem;">${fechaFormateada}</span>
                        </div>
                        <div>
                            <span style="display:inline-block; padding:0.2rem 1rem; border-radius:50px; font-size:0.75rem; font-weight:600; color:white; background:${color};">
                                ${estado}
                            </span>
                        </div>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem; flex-wrap:wrap; gap:0.5rem;">
                        <span style="font-size:0.9rem; color:var(--text-gray);">
                            <strong>${venta.productos.length}</strong> productos
                        </span>
                        <span style="font-weight:700; color:var(--primary-dark); font-size:1.1rem;">
                            ${formatoMexicano(venta.totalConIva || venta.total)}
                        </span>
                    </div>
                    ${venta.fechaEntrega ? `
                        <div style="margin-top:0.5rem; padding:0.4rem 0.8rem; background:#dcfce7; border-radius:8px; display:inline-block; font-size:0.8rem; color:#16a34a; font-weight:600;">
                            <i class="fas fa-truck"></i> Entrega programada: ${venta.fechaEntrega}
                        </div>
                    ` : ''}
                    <div style="margin-top:0.5rem; font-size:0.8rem; color:var(--text-gray);">
                        <i class="fas fa-chevron-right" style="font-size:0.7rem;"></i> Haz clic para ver detalles
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    container.innerHTML = html;
}

function renderizarHistorialCompras(filtroAno, filtroMes) {
    const container = document.getElementById('historialContent');
    if (!container) return;
    
    let ventasFiltradas = [...historialVentas];
    
    if (filtroAno && filtroAno !== 'todos') {
        const anoNum = parseInt(filtroAno);
        ventasFiltradas = ventasFiltradas.filter(v => {
            const fecha = v.fechaObj || parseFechaGoogleSheets(v.fecha);
            return fecha && fecha.getFullYear() === anoNum;
        });
    }
    
    if (filtroMes && filtroMes !== 'todos') {
        const mesNum = parseInt(filtroMes);
        ventasFiltradas = ventasFiltradas.filter(v => {
            const fecha = v.fechaObj || parseFechaGoogleSheets(v.fecha);
            return fecha && (fecha.getMonth() + 1) === mesNum;
        });
    }
    
    const totalPeriodo = ventasFiltradas.reduce((sum, v) => sum + (v.totalConIva || v.total), 0);
    
    if (ventasFiltradas.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <h4>Sin compras en este período</h4>
                <p>No hay registros de compras para los filtros seleccionados.</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:0.5rem;">
            <h3 style="margin:0; color:var(--primary-dark);">📋 Historial de Compras</h3>
            <span style="font-weight:700; color:var(--primary-dark); font-size:1.1rem;">
                Total: ${formatoMexicano(totalPeriodo)}
            </span>
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
                <thead>
                    <tr style="background:#f8f9fa;">
                        <th style="padding:0.8rem; text-align:left; font-weight:600; color:var(--primary-dark); border-bottom:2px solid #e2e8f0;">Folio</th>
                        <th style="padding:0.8rem; text-align:left; font-weight:600; color:var(--primary-dark); border-bottom:2px solid #e2e8f0;">Fecha</th>
                        <th style="padding:0.8rem; text-align:center; font-weight:600; color:var(--primary-dark); border-bottom:2px solid #e2e8f0;">Productos</th>
                        <th style="padding:0.8rem; text-align:right; font-weight:600; color:var(--primary-dark); border-bottom:2px solid #e2e8f0;">Total</th>
                        <th style="padding:0.8rem; text-align:center; font-weight:600; color:var(--primary-dark); border-bottom:2px solid #e2e8f0;">Estatus</th>
                        <th style="padding:0.8rem; text-align:center; font-weight:600; color:var(--primary-dark); border-bottom:2px solid #e2e8f0;">Acción</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    ventasFiltradas.forEach(venta => {
        const estado = venta.estado || 'Validando pago';
        const estadoColors = {
            'Validando pago': '#f59e0b',
            'En preparación': '#3b82f6',
            'En camino': '#8b5cf6',
            'Entregado': '#10b981'
        };
        const color = estadoColors[estado] || '#6b7280';
        const fecha = venta.fechaObj || parseFechaGoogleSheets(venta.fecha);
        const fechaFormateada = fecha ? fecha.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }) : 'Fecha no disponible';
        
        html += `
            <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="padding:0.8rem; font-weight:600; color:var(--primary-dark);">${venta.idVenta}</td>
                <td style="padding:0.8rem; color:var(--text-gray);">${fechaFormateada}</td>
                <td style="padding:0.8rem; text-align:center; color:var(--text-gray);">${venta.productos.length}</td>
                <td style="padding:0.8rem; text-align:right; font-weight:600; color:var(--primary-dark);">${formatoMexicano(venta.totalConIva || venta.total)}</td>
                <td style="padding:0.8rem; text-align:center;">
                    <span style="display:inline-block; padding:0.2rem 1rem; border-radius:50px; font-size:0.75rem; font-weight:600; color:white; background:${color};">
                        ${estado}
                    </span>
                </td>
                <td style="padding:0.8rem; text-align:center;">
                    <button onclick="verDetalleVenta('${venta.idVenta}')" style="padding:0.4rem 1rem; background:var(--primary-blue); color:white; border:none; border-radius:8px; cursor:pointer; font-size:0.8rem; transition:all 0.3s; font-family: 'Inter', sans-serif;">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
}

function renderizarEstadisticasProductos() {
    const container = document.getElementById('estadisticasContent');
    if (!container) return;
    
    if (productosMasComprados.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-bar"></i>
                <h4>Sin datos de productos</h4>
                <p>No hay suficientes datos para mostrar estadísticas.</p>
            </div>
        `;
        return;
    }
    
    const topProductos = productosMasComprados.slice(0, 10);
    const maxImporte = topProductos.length > 0 ? topProductos[0].totalImporte : 1;
    
    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:0.5rem;">
            <h3 style="margin:0; color:var(--primary-dark);">📊 Productos más comprados</h3>
            <span style="font-size:0.85rem; color:var(--text-gray);">Top ${topProductos.length} productos</span>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
    `;
    
    topProductos.forEach((prod, index) => {
        const porcentaje = (prod.totalImporte / maxImporte) * 100;
        
        html += `
            <div style="background:white; border-radius:12px; padding:1rem; border:1px solid #f3f4f6; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.3rem;">
                    <span style="font-weight:600; color:var(--primary-dark); font-size:0.95rem;">${prod.nombre}</span>
                    <span style="font-weight:700; color:var(--primary-dark); font-size:0.9rem;">${formatoMexicano(prod.totalImporte)}</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-gray); margin-bottom:0.3rem;">
                    <span>${prod.cantidad} unidades</span>
                    <span>${prod.veces} compras</span>
                </div>
                <div style="width:100%; height:6px; background:#f3f4f6; border-radius:3px; overflow:hidden;">
                    <div style="height:100%; border-radius:3px; background:linear-gradient(90deg, #3b82f6, #8b5cf6); width:${porcentaje}%; transition:width 1s ease;"></div>
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    
    const comprasPorMes = new Map();
    historialVentas.forEach(v => {
        const fecha = v.fechaObj || parseFechaGoogleSheets(v.fecha);
        if (!fecha) return;
        const key = `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,'0')}`;
        const label = `${fecha.toLocaleString('es-MX', {month:'short'})} ${fecha.getFullYear()}`;
        if (!comprasPorMes.has(key)) {
            comprasPorMes.set(key, { label, total: 0, cantidad: 0 });
        }
        const data = comprasPorMes.get(key);
        data.total += (v.totalConIva || v.total);
        data.cantidad += 1;
    });
    
    const mesesOrdenados = Array.from(comprasPorMes.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const ultimosMeses = mesesOrdenados.slice(-6);
    
    ultimosMeses.forEach(([key, data]) => {
        const promedio = data.cantidad > 0 ? data.total / data.cantidad : 0;
        html += `
            <div style="background:white; border-radius:12px; padding:1rem; border:1px solid #f3f4f6; text-align:center; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
                <div style="font-weight:600; color:var(--primary-dark); font-size:1rem;">${data.label}</div>
                <div style="font-size:1.5rem; font-weight:700; color:var(--primary-dark);">${data.cantidad}</div>
                <div style="font-size:0.75rem; color:var(--text-gray);">compras</div>
                <div style="font-size:0.85rem; color:var(--primary-dark); font-weight:600; margin-top:0.3rem;">${formatoMexicano(data.total)}</div>
                <div style="font-size:0.7rem; color:var(--text-gray);">Promedio: ${formatoMexicano(promedio)}</div>
            </div>
        `;
    });
    
    html += `</div>`;
    container.innerHTML = html;
}

function verDetalleVenta(idVenta) {
    const venta = historialVentas.find(v => v.idVenta === idVenta);
    if (!venta) {
        mostrarNotificacion('❌ No se encontró la venta');
        return;
    }
    
    const fecha = venta.fechaObj || parseFechaGoogleSheets(venta.fecha);
    const fechaFormateada = fecha ? fecha.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    }) : 'Fecha no disponible';
    
    const estadoColors = {
        'Validando pago': '#f59e0b',
        'En preparación': '#3b82f6',
        'En camino': '#8b5cf6',
        'Entregado': '#10b981'
    };
    const color = estadoColors[venta.estado] || '#6b7280';
    
    let htmlProductos = '';
    venta.productos.forEach(p => {
        htmlProductos += `
            <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="padding:0.6rem; color:var(--text-gray);">${p.nombre}</td>
                <td style="padding:0.6rem; text-align:center; color:var(--text-gray);">${p.cantidad}</td>
                <td style="padding:0.6rem; text-align:right; color:var(--text-gray);">${formatoMexicano(p.importe)}</td>
            </tr>
        `;
    });
    
    const total = venta.totalConIva || venta.total;
    const subtotal = total / 1.16;
    const iva = total - subtotal;
    
    const modalHtml = `
        <div id="modalDetalleVenta" class="modal-overlay active" onclick="if(event.target===this) cerrarModalDetalleVenta()">
            <div class="modal" style="max-width:700px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                    <h2 style="color:var(--primary-dark); margin:0;">🧾 ${venta.idVenta}</h2>
                    <button onclick="cerrarModalDetalleVenta()" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:var(--text-gray); transition:all 0.3s;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1.5rem; background:var(--gray-light); padding:1rem; border-radius:12px;">
                    <div>
                        <div style="font-size:0.75rem; color:var(--text-gray);">Fecha</div>
                        <div style="font-weight:600; color:var(--primary-dark);">${fechaFormateada}</div>
                    </div>
                    <div>
                        <div style="font-size:0.75rem; color:var(--text-gray);">Estatus</div>
                        <div><span style="display:inline-block; padding:0.2rem 1rem; border-radius:50px; font-size:0.75rem; font-weight:600; color:white; background:${color};">${venta.estado}</span></div>
                    </div>
                    <div>
                        <div style="font-size:0.75rem; color:var(--text-gray);">Productos</div>
                        <div style="font-weight:600; color:var(--primary-dark);">${venta.productos.length}</div>
                    </div>
                    <div>
                        <div style="font-size:0.75rem; color:var(--text-gray);">Total</div>
                        <div style="font-weight:700; color:var(--primary-dark); font-size:1.1rem;">${formatoMexicano(total)}</div>
                    </div>
                </div>
                
                <h3 style="color:var(--primary-dark); margin-bottom:0.5rem;">📦 Productos</h3>
                <div style="overflow-x:auto; margin-bottom:1.5rem;">
                    <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
                        <thead>
                            <tr style="background:#f8f9fa;">
                                <th style="padding:0.6rem; text-align:left; font-weight:600; color:var(--primary-dark); border-bottom:2px solid #e2e8f0;">Producto</th>
                                <th style="padding:0.6rem; text-align:center; font-weight:600; color:var(--primary-dark); border-bottom:2px solid #e2e8f0;">Cantidad</th>
                                <th style="padding:0.6rem; text-align:right; font-weight:600; color:var(--primary-dark); border-bottom:2px solid #e2e8f0;">Importe</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${htmlProductos}
                        </tbody>
                    </table>
                </div>
                
                <div style="text-align:right; padding-top:1rem; border-top:2px solid #e2e8f0;">
                    <p style="margin:0.2rem 0;"><strong>Subtotal:</strong> ${formatoMexicano(subtotal)}</p>
                    <p style="margin:0.2rem 0;"><strong>IVA (16%):</strong> ${formatoMexicano(iva)}</p>
                    <p style="margin:0.2rem 0; font-size:1.2rem; font-weight:700; color:var(--primary-dark);"><strong>Total:</strong> ${formatoMexicano(total)}</p>
                </div>
                
                <div style="display:flex; gap:0.5rem; margin-top:1rem; flex-wrap:wrap;">
                    <button onclick="cerrarModalDetalleVenta()" class="btn-cerrar-modal" style="flex:1;">
                        <i class="fas fa-times"></i> Cerrar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    const existing = document.getElementById('modalDetalleVenta');
    if (existing) existing.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function cerrarModalDetalleVenta() {
    const modal = document.getElementById('modalDetalleVenta');
    if (modal) modal.remove();
}

function renderizarHistorialVacio() {
    const container = document.getElementById('historialContent');
    if (container) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <h4>Sin compras registradas</h4>
                <p>Aún no tienes compras en tu historial.</p>
            </div>
        `;
    }
    
    const ordenesContainer = document.getElementById('ordenesContent');
    if (ordenesContainer) {
        ordenesContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clock"></i>
                <h4>Sin órdenes recientes</h4>
                <p>No tienes compras en los últimos 15 días.</p>
            </div>
        `;
    }
    
    const estadisticasContainer = document.getElementById('estadisticasContent');
    if (estadisticasContainer) {
        estadisticasContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-bar"></i>
                <h4>Sin datos de productos</h4>
                <p>No hay suficientes datos para mostrar estadísticas.</p>
            </div>
        `;
    }
}

function filtrarHistorial() {
    const anoSelect = document.getElementById('filtroAno');
    const mesSelect = document.getElementById('filtroMes');
    const ano = anoSelect ? anoSelect.value : 'todos';
    const mes = mesSelect ? mesSelect.value : 'todos';
    renderizarHistorialCompras(ano, mes);
}

// ============================================
// CRÉDITOS PENDIENTES CON VALIDACIÓN (COLUMNA P)
// ============================================

function cargarCreditosPendientesConValidacion() {
    console.log('📋 Cargando créditos pendientes con validación (columna P)...');
    
    const container = document.getElementById('creditosPendientesContent');
    if (!container) return;
    
    const creditosFiltrados = historialVentas.filter(v => {
        const tipoPago = v.tipoPago || '';
        const saldoPendiente = v.saldoPendiente || v.total || 0;
        
        const esCredito = (tipoPago === 'Crédito' || tipoPago === 'Crédito Parcial');
        const tieneSaldo = saldoPendiente > 0.01;
        
        if (!esCredito || !tieneSaldo) return false;
        
        const estaValidado = v.validado === true;
        
        return !estaValidado;
    });
    
    creditosPendientes = creditosFiltrados;
    
    console.log(`📊 Créditos encontrados (después de filtro VALIDADO columna P): ${creditosPendientes.length}`);
    
    const creditosEnProceso = creditosPendientes.filter(v => (v.estatusPago || '') === 'SI');
    const creditosPendientesReales = creditosPendientes.filter(v => (v.estatusPago || '') !== 'SI');
    
    console.log(`📊 Créditos en proceso (SI): ${creditosEnProceso.length}`);
    console.log(`📊 Créditos realmente pendientes: ${creditosPendientesReales.length}`);
    
    if (creditosPendientes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle" style="color:#16a34a;"></i>
                <h4>Sin créditos pendientes</h4>
                <p>No tienes compras a crédito pendientes de liquidar.</p>
            </div>
        `;
        document.getElementById('totalCreditoPendiente').textContent = 'Total: $0.00';
        return;
    }
    
    let totalPendiente = 0;
    let html = `<div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">`;
    
    creditosEnProceso.forEach((venta, index) => {
        const saldoPendiente = venta.saldoPendiente || venta.total || 0;
        totalPendiente += saldoPendiente;
        
        const fecha = venta.fechaObj || parseFechaGoogleSheets(venta.fecha);
        const fechaFormateada = fecha ? fecha.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }) : 'Fecha no disponible';
        
        let fechaPago = null;
        let fechaPagoFormateada = 'No definida';
        
        if (venta.fechaPago) {
            fechaPago = new Date(venta.fechaPago);
            if (!isNaN(fechaPago.getTime())) {
                fechaPagoFormateada = fechaPago.toLocaleDateString('es-MX', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                });
            }
        }
        
        if (!fechaPago || isNaN(fechaPago.getTime())) {
            const fechaVenta = venta.fechaObj || parseFechaGoogleSheets(venta.fecha);
            const diasCredito = venta.diasCredito || 20;
            if (fechaVenta) {
                fechaPago = new Date(fechaVenta);
                fechaPago.setDate(fechaPago.getDate() + diasCredito);
                if (!isNaN(fechaPago.getTime())) {
                    fechaPagoFormateada = fechaPago.toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                    });
                }
            }
        }
        
        html += `
            <div style="background:white; border-radius:12px; padding:1.2rem; border:1px solid #bfdbfe; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:0.5rem;">
                    <div>
                        <span style="font-weight:700; color:var(--primary-dark); font-size:1rem;">${venta.idVenta}</span>
                        <span style="font-size:0.75rem; color:var(--text-gray); margin-left:0.5rem;">${fechaFormateada}</span>
                        <div style="font-size:0.8rem; color:var(--text-gray); margin-top:0.2rem;">
                            <span class="badge badge-warning">${venta.tipoPago || 'Crédito'}</span>
                            <span class="badge badge-info" style="margin-left:0.5rem;background:#3b82f6;color:white;">Validando pago</span>
                            ${venta.diasCredito ? `<span style="font-size:0.7rem; color:var(--text-gray); margin-left:0.5rem;">${venta.diasCredito} días</span>` : ''}
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-weight:700; color:#3b82f6; font-size:1.1rem;">
                            ${formatoMexicano(saldoPendiente)}
                        </div>
                        <div style="font-size:0.7rem; color:var(--text-gray);">Límite: ${fechaPagoFormateada}</div>
                        <div style="font-size:0.7rem; color:#3b82f6; font-weight:600;">Validando pago</div>
                    </div>
                </div>
                <div style="margin-top:0.5rem; padding-top:0.5rem; border-top:1px solid #f3f4f6;">
                    <div style="font-size:0.8rem; color:var(--text-gray);">
                        <strong>Productos:</strong> ${venta.productos ? venta.productos.length : 0}
                    </div>
                    <div style="font-size:0.8rem; color:var(--text-gray);">
                        <strong>Total:</strong> ${formatoMexicano(venta.total || 0)}
                        ${venta.anticipo ? ` | <strong>Pagado:</strong> ${formatoMexicano(venta.anticipo)}` : ''}
                    </div>
                </div>
                <div style="width:100%; margin-top:0.8rem; padding:0.5rem; text-align:center; background:#eff6ff; border-radius:8px; color:#3b82f6; font-weight:600; font-size:0.85rem;">
                    <i class="fas fa-spinner fa-spin"></i> Validando pago...
                </div>
            </div>
        `;
    });
    
    creditosPendientesReales.forEach((venta, index) => {
        const saldoPendiente = venta.saldoPendiente || venta.total || 0;
        totalPendiente += saldoPendiente;
        
        const fecha = venta.fechaObj || parseFechaGoogleSheets(venta.fecha);
        const fechaFormateada = fecha ? fecha.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }) : 'Fecha no disponible';
        
        let fechaPago = null;
        let fechaPagoFormateada = 'No definida';
        
        if (venta.fechaPago) {
            fechaPago = new Date(venta.fechaPago);
            if (!isNaN(fechaPago.getTime())) {
                fechaPagoFormateada = fechaPago.toLocaleDateString('es-MX', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                });
            }
        }
        
        if (!fechaPago || isNaN(fechaPago.getTime())) {
            const fechaVenta = venta.fechaObj || parseFechaGoogleSheets(venta.fecha);
            const diasCredito = venta.diasCredito || 20;
            if (fechaVenta) {
                fechaPago = new Date(fechaVenta);
                fechaPago.setDate(fechaPago.getDate() + diasCredito);
                if (!isNaN(fechaPago.getTime())) {
                    fechaPagoFormateada = fechaPago.toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                    });
                }
            }
        }
        
        const estaVencido = fechaPago && !isNaN(fechaPago.getTime()) && fechaPago < new Date();
        const estadoColor = estaVencido ? '#dc2626' : '#92400e';
        const estadoTexto = estaVencido ? '⚠️ VENCIDO' : 'Pendiente';
        
        html += `
            <div style="background:white; border-radius:12px; padding:1.2rem; border:1px solid ${estaVencido ? '#fecaca' : '#fef3c7'}; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:0.5rem;">
                    <div>
                        <span style="font-weight:700; color:var(--primary-dark); font-size:1rem;">${venta.idVenta}</span>
                        <span style="font-size:0.75rem; color:var(--text-gray); margin-left:0.5rem;">${fechaFormateada}</span>
                        <div style="font-size:0.8rem; color:var(--text-gray); margin-top:0.2rem;">
                            <span class="badge badge-warning">${venta.tipoPago || 'Crédito'}</span>
                            ${estaVencido ? '<span class="badge badge-danger" style="margin-left:0.5rem;">VENCIDO</span>' : ''}
                            ${venta.diasCredito ? `<span style="font-size:0.7rem; color:var(--text-gray); margin-left:0.5rem;">${venta.diasCredito} días</span>` : ''}
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-weight:700; color:${estadoColor}; font-size:1.1rem;">
                            ${formatoMexicano(saldoPendiente)}
                        </div>
                        <div style="font-size:0.7rem; color:var(--text-gray);">Límite: ${fechaPagoFormateada}</div>
                        <div style="font-size:0.7rem; color:${estadoColor}; font-weight:600;">${estadoTexto}</div>
                    </div>
                </div>
                <div style="margin-top:0.5rem; padding-top:0.5rem; border-top:1px solid #f3f4f6;">
                    <div style="font-size:0.8rem; color:var(--text-gray);">
                        <strong>Productos:</strong> ${venta.productos ? venta.productos.length : 0}
                    </div>
                    <div style="font-size:0.8rem; color:var(--text-gray);">
                        <strong>Total:</strong> ${formatoMexicano(venta.total || 0)}
                        ${venta.anticipo ? ` | <strong>Pagado:</strong> ${formatoMexicano(venta.anticipo)}` : ''}
                    </div>
                </div>
                <button class="btn-primary" style="width:100%; margin-top:0.8rem; padding:0.5rem; font-size:0.85rem;" 
                        onclick="abrirModalPagoCreditoPendiente('${venta.idVenta}')">
                    <i class="fas fa-university"></i> Liquidar con Transferencia
                </button>
            </div>
        `;
    });
    
    html += `</div>`;
    container.innerHTML = html;
    document.getElementById('totalCreditoPendiente').textContent = `Total: ${formatoMexicano(totalPendiente)}`;
}

function abrirModalPagoCreditoPendiente(idVenta) {
    const venta = creditosPendientes.find(v => v.idVenta === idVenta);
    if (!venta) {
        mostrarNotificacion('❌ No se encontró la venta');
        return;
    }
    
    creditoSeleccionadoParaPago = venta;
    const saldoPendiente = venta.saldoPendiente || venta.total || 0;
    
    const modalHtml = `
        <div id="modalPagoCredito" class="modal-overlay active" onclick="if(event.target===this) cerrarModalPagoCredito()">
            <div class="modal" style="max-width:500px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                    <h2 style="color:var(--primary-dark); margin:0;">💳 Liquidar Crédito</h2>
                    <button onclick="cerrarModalPagoCredito()" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:var(--text-gray);">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div id="modalPagoCreditoMensaje" style="display:none;"></div>
                
                <div style="background:#fef3c7; padding:1rem; border-radius:12px; margin-bottom:1rem; border:1px solid #fde68a;">
                    <p style="margin:0; font-weight:600; color:#92400e;">🧾 ${venta.idVenta}</p>
                    <p style="margin:0.3rem 0 0 0; font-size:0.9rem; color:#92400e;">
                        <strong>Saldo pendiente:</strong> ${formatoMexicano(saldoPendiente)}
                    </p>
                </div>
                
                <div class="datos-bancarios">
                    <p><strong>PROCONSTRUCCIONMX SAS DE CV</strong></p>
                    <p><strong>BANCO:</strong> BBVA</p>
                    <p><strong>NÚMERO DE CUENTA:</strong> 0127744064</p>
                    <p><strong>CUENTA CLABE:</strong> 012180001277440643</p>
                </div>
                
                <div class="form-group">
                    <label>Monto a transferir: <strong id="montoTransferenciaCredito">${formatoMexicano(saldoPendiente)}</strong></label>
                </div>
                <div class="form-group">
                    <label>Número de referencia o folio de transferencia <span style="color:red;">*</span></label>
                    <input type="text" id="referenciaTransferenciaCredito" placeholder="Ej: 1234567890">
                </div>
                <div class="form-group">
                    <label>Subir comprobante de transferencia <span style="color:red;">*</span></label>
                    <div class="file-upload" onclick="document.getElementById('comprobanteFileCredito').click()">
                        <i class="fas fa-cloud-upload-alt" style="font-size:2rem; color: var(--accent-orange);"></i>
                        <p>Haz clic para seleccionar tu comprobante</p>
                        <p class="file-name" id="fileNameCredito">Ningún archivo seleccionado</p>
                        <input type="file" id="comprobanteFileCredito" accept="*/*" onchange="cargarComprobanteCredito(event)">
                    </div>
                </div>
                
                <button class="btn-enviar" id="btnConfirmarPagoCredito" onclick="procesarPagoCreditoPendiente()" disabled>
                    <i class="fas fa-paper-plane"></i> Confirmar Pago
                </button>
                <button class="btn-cerrar-modal" onclick="cerrarModalPagoCredito()">
                    <i class="fas fa-times"></i> Cancelar
                </button>
            </div>
        </div>
    `;
    
    const existing = document.getElementById('modalPagoCredito');
    if (existing) existing.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    document.getElementById('referenciaTransferenciaCredito').addEventListener('input', validarCamposCreditoPendiente);
}

function validarCamposCreditoPendiente() {
    const referencia = document.getElementById('referenciaTransferenciaCredito').value.trim();
    const archivo = document.getElementById('fileNameCredito').textContent;
    const btn = document.getElementById('btnConfirmarPagoCredito');
    
    if (btn) {
        if (referencia && archivo && archivo !== 'Ningún archivo seleccionado') {
            btn.disabled = false;
            btn.title = '';
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        } else {
            btn.disabled = true;
            btn.title = 'Completa el número de referencia y sube el comprobante';
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        }
    }
}

function cerrarModalPagoCredito() {
    const modal = document.getElementById('modalPagoCredito');
    if (modal) modal.remove();
    comprobanteCreditoBase64 = null;
    comprobanteCreditoNombre = null;
    creditoSeleccionadoParaPago = null;
}

function mostrarMensajeModalPagoCredito(tipo, mensaje) {
    const div = document.getElementById('modalPagoCreditoMensaje');
    if (div) {
        div.className = tipo === 'exito' ? 'mensaje-exito' : 'mensaje-error';
        div.innerHTML = mensaje;
        div.style.display = 'block';
    }
}

async function procesarPagoCreditoPendiente() {
    const referencia = document.getElementById('referenciaTransferenciaCredito').value.trim();
    
    if (!referencia) {
        mostrarMensajeModalPagoCredito('error', '⚠️ El número de referencia o folio de transferencia es obligatorio.');
        return;
    }
    
    if (!comprobanteCreditoBase64) {
        mostrarMensajeModalPagoCredito('error', '⚠️ Por favor, sube el comprobante de transferencia.');
        return;
    }
    
    if (!creditoSeleccionadoParaPago) {
        mostrarMensajeModalPagoCredito('error', '❌ No se encontró la venta seleccionada.');
        return;
    }
    
    const btn = document.getElementById('btnConfirmarPagoCredito');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="loading-spinner"></span> Procesando...';
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    }
    
    try {
        const venta = creditoSeleccionadoParaPago;
        const saldoPendiente = venta.saldoPendiente || venta.total || 0;
        
        const folioOriginal = venta.idVenta;
        const fecha = new Date();
        
        const productosParaVenta = venta.productos ? venta.productos.map(p => ({
            ...p,
            _tipo: 'pago'
        })) : [];
        
        const datosVenta = {
            folio: folioOriginal,
            fecha: fecha,
            cliente: clienteData,
            direccion: null,
            productos: productosParaVenta,
            total: saldoPendiente,
            subtotal: saldoPendiente / 1.16,
            iva: saldoPendiente - (saldoPendiente / 1.16),
            tipoPago: 'Transferencia (Liquidación Crédito)',
            referencia: referencia,
            comprobante: comprobanteCreditoBase64,
            comprobanteNombre: comprobanteCreditoNombre,
            comprobanteTipo: 'image/jpeg',
            sucursal: SUCURSAL_WEB,
            nombreDireccion: 'Liquidación de crédito',
            requiereFactura: false,
            datosFactura: null,
            montoPago: saldoPendiente,
            montoCredito: 0,
            estadoPago: 'Liquidado',
            esCreditoParcial: false,
            diasCredito: 0,
            fechaPago: null,
            saldoPendiente: 0,
            anticipo: saldoPendiente,
            esLiquidacionCredito: true,
            idVentaOriginal: venta.idVenta,
            creditoOriginal: saldoPendiente
        };
        
        console.log('📊 Liquidando crédito:', datosVenta);
        
        await guardarVentaEnEstadisticas(datosVenta);
        await enviarCorreoConAdjuntoAppsScript(datosVenta);
        
        try {
            await fetchAutenticado(`${WORKER_URL}/ventas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify({
                    action: 'actualizarEstatusPago',
                    idVentaOriginal: venta.idVenta
                })
            });
            console.log('✅ Estatus actualizado a SI para:', venta.idVenta);
        } catch (error) {
            console.error('❌ Error al actualizar estatus:', error);
        }
        
        mostrarMensajeModalPagoCredito('exito', `
            ✅ ¡Pago registrado con éxito!<br>
            <strong>Venta original:</strong> ${venta.idVenta}<br>
            <strong>Monto liquidado:</strong> ${formatoMexicano(saldoPendiente)}<br>
            <strong>Referencia:</strong> ${referencia}<br><br>
            Se ha enviado un correo a ventas@proconstruccionmx.com con los detalles.
            <br><br>
            <span style="color:#16a34a;font-weight:600;">✅ El estatus de la venta ha sido actualizado a "Validando pago".</span>
        `);
        
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '✅ Pago registrado';
            btn.style.opacity = '1';
            btn.style.cursor = 'default';
        }
        
        setTimeout(() => {
            cerrarModalPagoCredito();
            cargarHistorialCompras();
        }, 5000);
        
    } catch (error) {
        console.error('Error al procesar pago:', error);
        mostrarMensajeModalPagoCredito('error', '❌ Error al procesar el pago. Por favor, intenta de nuevo.');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Confirmar Pago';
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        }
    }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function formatoMexicano(numero) {
    const num = Number(numero);
    if (isNaN(num)) return '$0.00';
    const partes = num.toFixed(2).split('.');
    const enteros = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `$${enteros}.${partes[1]}`;
}

function generarFolio() {
    const hoy = new Date();
    const dd = String(hoy.getDate()).padStart(2, '0');
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const yyyy = hoy.getFullYear();
    const prefijo = `CT-${dd}${mm}${yyyy}-`;
    
    const numero = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
    return prefijo + numero;
}

function mostrarNotificacion(mensaje) {
    const div = document.createElement('div');
    div.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: #0A2540;
        color: white;
        padding: 1rem 2rem;
        border-radius: 12px;
        font-weight: 600;
        z-index: 2000;
        box-shadow: 0 8px 30px rgba(0,0,0,0.2);
        animation: fadeInUp 0.3s ease-out;
        max-width: 90%;
        text-align: center;
    `;
    div.textContent = mensaje;
    document.body.appendChild(div);
    
    setTimeout(() => {
        div.style.opacity = '0';
        div.style.transition = 'opacity 0.3s ease';
        setTimeout(() => div.remove(), 300);
    }, 3000);
}

function mostrarMensajeModal(tipo, mensaje) {
    const div = document.getElementById('modalMensaje');
    div.className = tipo === 'exito' ? 'mensaje-exito' : 'mensaje-error';
    div.innerHTML = mensaje;
    div.style.display = 'block';
}

function configurarTabs() {
    const tabs = document.querySelectorAll('.dashboard-tabs button');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const target = this.dataset.tab;
            
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            contents.forEach(c => c.classList.remove('active'));
            document.getElementById(target).classList.add('active');
            
            if (target === 'tab-compras' && historialVentas.length === 0) {
                cargarHistorialCompras();
            }
            
            if (target === 'tab-sesiones') {
                cargarSesionesActivas();
            }
        });
    });
    
    // ⭐ NUEVO: Si la URL trae ?tab=sesiones, activar esa pestaña automáticamente
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'sesiones') {
        const tabSesiones = document.querySelector('[data-tab="tab-sesiones"]');
        if (tabSesiones) {
            setTimeout(() => tabSesiones.click(), 500);
        }
    }
}
// ============================================
// ⭐ FASE 2: PANEL DE SESIONES
// ============================================

let sesionesActivas = [];

async function cargarSesionesActivas() {
    const container = document.getElementById('sesionesContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="sesiones-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Cargando sesiones...</p>
        </div>
    `;
    
    try {
        console.log('📥 Cargando sesiones activas...');
        
        const response = await fetchAutenticado(`${WORKER_URL}/sesiones`, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({ action: 'listar' })
        });
        
        const result = await response.json();
        console.log('📥 Respuesta /sesiones:', result);
        
        if (!result.success || !result.sesiones) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle" style="color:#dc2626;"></i>
                    <h4>Error al cargar sesiones</h4>
                    <p>${result.error || 'No se pudieron obtener las sesiones activas.'}</p>
                    <button class="btn-primary" style="margin-top:1rem;padding:0.6rem 1.5rem;" onclick="cargarSesionesActivas()">
                        <i class="fas fa-sync-alt"></i> Reintentar
                    </button>
                </div>
            `;
            return;
        }
        
        sesionesActivas = result.sesiones;
        console.log(`📦 Sesiones activas: ${sesionesActivas.length}`);
        
        renderizarSesiones(sesionesActivas);
        
    } catch (error) {
        console.error('❌ Error al cargar sesiones:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle" style="color:#dc2626;"></i>
                <h4>Error de conexión</h4>
                <p>No se pudo conectar con el servidor. Intenta de nuevo.</p>
                <button class="btn-primary" style="margin-top:1rem;padding:0.6rem 1.5rem;" onclick="cargarSesionesActivas()">
                    <i class="fas fa-sync-alt"></i> Reintentar
                </button>
            </div>
        `;
    }
}

function renderizarSesiones(sesiones) {
    const container = document.getElementById('sesionesContent');
    if (!container) return;
    
    if (!sesiones || sesiones.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shield-alt" style="color:#16a34a;"></i>
                <h4>Sin sesiones activas</h4>
                <p>No hay dispositivos con sesión activa en este momento.</p>
            </div>
        `;
        return;
    }
    
    const tokenActual = sessionStorage.getItem('sessionToken');
    
    let html = `<div class="sesiones-grid">`;
    
    sesiones.forEach((sesion, index) => {
        const esActual = sesion.token === tokenActual;
        const infoDispositivo = parseUserAgent(sesion.userAgent);
        const icono = obtenerIconoDispositivo(infoDispositivo.tipo);
        const tokenCorto = sesion.token ? sesion.token.substring(0, 8) + '...' : 'N/A';
        const ubicacion = sesion.ubicacion || 'Desconocida';
        const ip = sesion.ip || 'Desconocida';
        const fechaCreacion = formatearFechaSesion(sesion.fechaCreacion);
        const fechaExpiracion = formatearFechaSesion(sesion.fechaExpiracion);
        
        html += `
            <div class="sesion-card ${esActual ? 'actual' : ''}" id="sesion-card-${index}">
                <div class="sesion-header">
                    <div class="sesion-header-left">
                        <div class="sesion-icon">
                            <i class="fas ${icono}"></i>
                        </div>
                        <div class="sesion-titulo">
                            <h4>${infoDispositivo.navegador} en ${infoDispositivo.so}</h4>
                            <small>${infoDispositivo.descripcion}</small>
                        </div>
                    </div>
                </div>
                <div class="sesion-body">
                    <div class="sesion-info-row">
                        <i class="fas fa-globe"></i>
                        <span><strong>Ubicación:</strong> ${ubicacion}</span>
                    </div>
                    <div class="sesion-info-row">
                        <i class="fas fa-network-wired"></i>
                        <span><strong>IP:</strong> ${ip}</span>
                    </div>
                    <div class="sesion-info-row">
                        <i class="fas fa-key"></i>
                        <span><strong>Token:</strong> ${tokenCorto}</span>
                    </div>
                </div>
                <div class="sesion-footer">
                    <div class="sesion-fechas">
                        <div><i class="fas fa-sign-in-alt"></i> Inicio: ${fechaCreacion}</div>
                        <div><i class="fas fa-hourglass-half"></i> Expira: ${fechaExpiracion}</div>
                    </div>
                    ${esActual ? `
                        <span style="font-size:0.7rem;color:var(--accent-orange-dark);font-weight:700;">
                            <i class="fas fa-check-circle"></i> Actual
                        </span>
                    ` : `
                        <button class="btn-cerrar-sesion" onclick="cerrarSesionDispositivo('${sesion.token}', ${esActual}, ${index})">
                            <i class="fas fa-sign-out-alt"></i> Cerrar
                        </button>
                    `}
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    container.innerHTML = html;
}

function parseUserAgent(ua) {
    if (!ua || ua === 'Desconocido' || ua === 'Desconocida') {
        return {
            navegador: 'Desconocido',
            so: 'Desconocido',
            tipo: 'desconocido',
            descripcion: 'Dispositivo no identificado'
        };
    }
    
    let navegador = 'Desconocido';
    let so = 'Desconocido';
    let tipo = 'desktop';
    let descripcion = '';
    
    // Detectar navegador
    if (ua.includes('Edg/') || ua.includes('Edge/')) {
        navegador = 'Edge';
    } else if (ua.includes('OPR/') || ua.includes('Opera')) {
        navegador = 'Opera';
    } else if (ua.includes('Chrome/') && !ua.includes('Chromium')) {
        navegador = 'Chrome';
    } else if (ua.includes('Firefox/')) {
        navegador = 'Firefox';
    } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
        navegador = 'Safari';
    }
    
    // Detectar SO
    if (ua.includes('iPhone')) {
        so = 'iPhone';
        tipo = 'movil';
    } else if (ua.includes('iPad')) {
        so = 'iPad';
        tipo = 'tablet';
    } else if (ua.includes('Android')) {
        so = 'Android';
        tipo = ua.includes('Mobile') ? 'movil' : 'tablet';
    } else if (ua.includes('Windows NT 10.0')) {
        so = 'Windows 10/11';
    } else if (ua.includes('Windows NT 6.3')) {
        so = 'Windows 8.1';
    } else if (ua.includes('Windows NT 6.1')) {
        so = 'Windows 7';
    } else if (ua.includes('Windows')) {
        so = 'Windows';
    } else if (ua.includes('Macintosh') || ua.includes('Mac OS X')) {
        so = 'macOS';
    } else if (ua.includes('Linux')) {
        so = 'Linux';
    }
    
    // Versión del navegador
    let version = '';
    const matchChrome = ua.match(/Chrome\/(\d+)/);
    const matchFirefox = ua.match(/Firefox\/(\d+)/);
    const matchSafari = ua.match(/Version\/(\d+)/);
    const matchEdge = ua.match(/Edg\/(\d+)/);
    
    if (navegador === 'Chrome' && matchChrome) version = matchChrome[1];
    else if (navegador === 'Firefox' && matchFirefox) version = matchFirefox[1];
    else if (navegador === 'Safari' && matchSafari) version = matchSafari[1];
    else if (navegador === 'Edge' && matchEdge) version = matchEdge[1];
    
    descripcion = `${navegador} ${version ? 'v' + version : ''} · ${so}`.trim();
    
    return { navegador, so, tipo, descripcion };
}

function obtenerIconoDispositivo(tipo) {
    switch (tipo) {
        case 'movil': return 'fa-mobile-alt';
        case 'tablet': return 'fa-tablet-alt';
        case 'desktop': return 'fa-laptop';
        default: return 'fa-question-circle';
    }
}

function formatearFechaSesion(fechaStr) {
    if (!fechaStr) return 'N/A';
    
    // El Apps Script devuelve String(data[i][2]) que suele ser "Wed Oct 22 2026 21:47:06 GMT-0600..."
    // o también "22/10/2026 21:47:06" si se formateó distinto.
    try {
        const fecha = new Date(fechaStr);
        if (!isNaN(fecha.getTime())) {
            return fecha.toLocaleString('es-MX', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    } catch (e) {}
    
    // Fallback: intentar parsear como "22/10/2026 21:47:06"
    const match = String(fechaStr).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/);
    if (match) {
        const fecha = new Date(
            parseInt(match[3]),
            parseInt(match[2]) - 1,
            parseInt(match[1]),
            parseInt(match[4]),
            parseInt(match[5]),
            parseInt(match[6])
        );
        if (!isNaN(fecha.getTime())) {
            return fecha.toLocaleString('es-MX', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }
    
    return String(fechaStr);
}

async function cerrarSesionDispositivo(tokenSesion, esActual, index) {
    if (esActual) {
        if (!confirm('⚠️ Estás a punto de cerrar TU PROPIA sesión. Serás redirigido al login. ¿Continuar?')) {
            return;
        }
    } else {
        if (!confirm('¿Cerrar la sesión de este dispositivo? El usuario tendrá que volver a iniciar sesión en él.')) {
            return;
        }
    }
    
    const card = document.getElementById(`sesion-card-${index}`);
    const boton = card ? card.querySelector('.btn-cerrar-sesion') : null;
    if (boton) {
        boton.disabled = true;
        boton.innerHTML = '<span class="loading-spinner" style="width:14px;height:14px;border-width:2px;"></span> Cerrando...';
    }
    
    try {
        console.log('🔒 Cerrando sesión:', tokenSesion.substring(0, 10) + '...');
        
        const response = await fetchAutenticado(`${WORKER_URL}/sesiones`, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'cerrar',
                tokenCerrar: tokenSesion
            })
        });
        
        const result = await response.json();
        console.log('📥 Respuesta cerrar sesión:', result);
        
        if (result.success) {
            mostrarNotificacion('✅ Sesión cerrada correctamente');
            
            if (esActual) {
                setTimeout(() => {
                    sessionStorage.clear();
                    window.location.href = 'login.html';
                }, 1000);
            } else {
                if (card) {
                    card.style.transition = 'all 0.4s ease';
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.9)';
                    setTimeout(() => {
                        card.remove();
                        sesionesActivas = sesionesActivas.filter(s => s.token !== tokenSesion);
                        if (sesionesActivas.length === 0) {
                            renderizarSesiones([]);
                        }
                    }, 400);
                }
            }
        } else {
            mostrarNotificacion('❌ ' + (result.error || 'No se pudo cerrar la sesión'));
            if (boton) {
                boton.disabled = false;
                boton.innerHTML = '<i class="fas fa-sign-out-alt"></i> Cerrar';
            }
        }
        
    } catch (error) {
        console.error('❌ Error al cerrar sesión:', error);
        mostrarNotificacion('❌ Error al cerrar la sesión. Intenta de nuevo.');
        if (boton) {
            boton.disabled = false;
            boton.innerHTML = '<i class="fas fa-sign-out-alt"></i> Cerrar';
        }
    }
}
function generarTokenConfirmacion() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 64; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}
