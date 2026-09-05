// ============================================
// CONFIGURACIÓN - IDS DE GOOGLE SHEETS
// ============================================
const ID_PRODUCTOS = '1tRhmgmbhL47vBIldtSFnrvFlFLHYADKq23BKGnRAWQk';
const HOJA_PRODUCTOS = 'Hoja 1';

const ID_BASE_CLIENTES = '1yCQ-cJJ7PALDYSwIcpsj1ZfACtNLJwfOR7HY-mPzgx4';
const HOJA_BASE_CLIENTES = 'Hoja 1';
const HOJA_DIRECCIONES = 'Direcciones';

const ID_FACTURACION = '1kGtq_MQye-GnvcbxNSA1o_gx6MCKkjwFcEKWEQdrX_g';
const HOJA_FACTURACION = 'Facturacion';

const ID_ESTADISTICAS = '1jCvEvZ2aBF2nRhE_Jsw_S_8yDFYZgaWwIUNu9pNNKGc';
const HOJA_EST_PRODUCTOS = 'Productos';
const HOJA_EST_CLIENTES = 'Clientes';

const ID_USUARIOS = '1Q5V6Wie_kQwqvnofuVzIcyerRaKZxJ2lvMHK6LY9gaU';
const HOJA_USUARIOS = 'Hoja 1';

const ID_ARCHIVO_PRECIOS_ESPECIALES = '10t2A9M5f1Bj7lyTTa_PhVGRv0wAK_4ePpk_1eURZQ5I';
const HOJA_PRECIOS_ESPECIALES = 'Hoja 1';

const ID_COTIZACIONES = '1S4qoHh3lTDoSUwDNeilmN6QKk8uhmvxjwvRQpEHQbS0';
const HOJA_COTIZACIONES = 'Hoja 1';

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz4MPJ6QmLIOsN85H9bc-E5uxozb0kVicms6c51VLwappox_ZpISSyawzfVrzof6WA3mA/exec';

const APPS_SCRIPT_FACTURACION_URL = 'https://script.google.com/macros/s/AKfycbwcEwB2K17lhR5d52eab8EL-2K7C2mXzEubtyP-TcF-VWcmfNS-lODtFWAYdllNmHz9Mg/exec';

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

// ============================================
// FUNCIÓN PARA PARSEAR FECHAS CORRECTAMENTE
// ============================================

function parseFechaGoogleSheets(fechaStr) {
    if (!fechaStr) return null;
    
    function esDateValido(obj) {
        if (obj instanceof Date) {
            return !isNaN(obj.getTime());
        }
        if (typeof obj === 'object' && obj !== null) {
            if (typeof obj.getTime === 'function' && typeof obj.getFullYear === 'function') {
                try {
                    return !isNaN(obj.getTime());
                } catch (e) {
                    return false;
                }
            }
        }
        return false;
    }
    
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
    
    if (typeof emailjs !== 'undefined') {
        try {
            emailjs.init('_gOxtGSQmrhTdoRuX');
            console.log('✅ EmailJS inicializado desde dashboard.js');
        } catch (e) {
            console.warn('⚠️ EmailJS ya estaba inicializado o error:', e);
        }
    } else {
        console.warn('⚠️ EmailJS no está disponible al inicio');
    }
    
    if (sessionStorage.getItem('userLoggedIn') !== 'true') {
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
        
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });
        
        console.log(`✅ Petición enviada a ${sheetName} (no-cors)`);
        return { success: true };
        
    } catch (error) {
        console.error('❌ Error al guardar fila:', error);
        return { success: false, error: error.toString() };
    }
}

async function agregarDireccionEnSheets(direccion) {
    try {
        console.log('📝 Enviando a Apps Script - AGREGAR:', direccion);
        
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
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
        
        console.log('📝 Petición AGREGAR enviada (no-cors)');
        return { success: true };
        
    } catch (error) {
        console.error('Error al agregar dirección:', error);
        return { success: false, error: error.toString() };
    }
}

async function actualizarDireccionEnSheets(fila, datos) {
    try {
        const filaEnviar = fila + 1;
        console.log('📝 Enviando a Apps Script - ACTUALIZAR - Fila original:', fila, '→ Enviando:', filaEnviar);
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
            nombreRecibe: datos.nombreRecibe
        };
        
        console.log('📝 Body enviado:', JSON.stringify(body));
        
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });
        
        console.log('📝 Petición ACTUALIZAR enviada (no-cors) para fila:', filaEnviar);
        return { success: true };
        
    } catch (error) {
        console.error('Error al actualizar dirección:', error);
        return { success: false, error: error.toString() };
    }
}

async function eliminarDireccionEnSheets(fila) {
    try {
        const filaEnviar = fila + 1;
        console.log('🗑️ Enviando a Apps Script - ELIMINAR - Fila original:', fila, '→ Enviando:', filaEnviar);
        
        const body = {
            action: 'eliminar',
            fila: filaEnviar
        };
        
        console.log('🗑️ Body enviado:', JSON.stringify(body));
        
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });
        
        console.log('🗑️ Petición ELIMINAR enviada (no-cors) para fila:', filaEnviar);
        return { success: true };
        
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
        
        const url = APPS_SCRIPT_FACTURACION_URL;
        console.log('📥 URL del Apps Script:', url);
        
        const response = await fetch(url);
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
        console.log('📝 Enviando a Apps Script - ACTUALIZAR FACTURACIÓN');
        console.log('📝 Datos:', datosActualizados);
        console.log('📝 Fila:', fila);
        
        await fetch(APPS_SCRIPT_FACTURACION_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
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
        
        console.log('✅ Petición enviada (no-cors)');
        
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
        console.log('🗑️ Enviando a Apps Script - ELIMINAR FACTURACIÓN');
        console.log('🗑️ Fila:', fact.fila);
        
        await fetch(APPS_SCRIPT_FACTURACION_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'eliminarFacturacion',
                fila: fact.fila
            })
        });
        
        console.log('✅ Petición ELIMINAR enviada (no-cors)');
        
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
        console.log('📝 Enviando a Apps Script - AGREGAR FACTURACIÓN');
        console.log('📝 Datos:', datos);
        
        await fetch(APPS_SCRIPT_FACTURACION_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
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
        
        console.log('✅ Petición AGREGAR enviada (no-cors)');
        
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
        console.log('📝 Enviando a Apps Script - AGREGAR FACTURACIÓN (desde pago)');
        console.log('📝 Datos:', datos);
        
        await fetch(APPS_SCRIPT_FACTURACION_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
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
        
        console.log('✅ Petición AGREGAR enviada (no-cors)');
        
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
// CARGA DE DATOS (CLIENTES, PRODUCTOS, ETC)
// ============================================

async function cargarDatosCliente(email) {
    try {
        const url = `https://docs.google.com/spreadsheets/d/${ID_BASE_CLIENTES}/gviz/tq?tqx=out:json&sheet=${HOJA_BASE_CLIENTES}`;
        const response = await fetch(url);
        const text = await response.text();
        const jsonStr = text.substring(text.indexOf('(') + 1, text.lastIndexOf(')'));
        const data = JSON.parse(jsonStr);
        const rows = data.table.rows;
        
        for (let i = 1; i < rows.length; i++) {
            const values = rows[i].c.map(cell => cell ? cell.v : '');
            const correo = String(values[3] || '').trim();
            
            if (correo.toLowerCase() === email.toLowerCase()) {
                const creditoHabilitadoRaw = String(values[13] || '').trim().toUpperCase();
                const creditoHabilitado = creditoHabilitadoRaw === 'SI' || creditoHabilitadoRaw === 'TRUE' || creditoHabilitadoRaw === 'VERDADERO';
                
                clienteData = {
                    codigo: String(values[0] || '').trim(),
                    nombre: String(values[1] || '').trim(),
                    giro: String(values[2] || '').trim(),
                    correo: correo,
                    telefono: String(values[4] || '').trim(),
                    descuento: parseFloat(values[5]) || 0,
                    noCompras: parseInt(values[6]) || 0,
                    montoCompras: parseFloat(values[7]) || 0,
                    creditoPendiente: parseFloat(values[8]) || 0,
                    creditoLiquidado: parseFloat(values[9]) || 0,
                    sucursal: String(values[10] || '').trim(),
                    fechaRegistro: String(values[11] || '').trim(),
                    creditoHabilitado: creditoHabilitado,
                    limiteCreditoPeso: parseFloat(values[14]) || 0,
                    limiteCreditoMonto: parseFloat(values[15]) || 0
                };
                
                clienteCreditoHabilitado = clienteData.creditoHabilitado;
                clienteLimiteCreditoPeso = clienteData.limiteCreditoPeso;
                clienteLimiteCreditoMonto = clienteData.limiteCreditoMonto;
                
                console.log('💳 CRÉDITO HABILITADO:', clienteCreditoHabilitado);
                console.log('⚖️ LÍMITE CRÉDITO PESO:', clienteLimiteCreditoPeso, 'kg');
                console.log('💰 LÍMITE CRÉDITO MONTO:', clienteLimiteCreditoMonto);
                console.log('📊 DESCUENTO BASE DEL CLIENTE:', clienteData.descuento + '%');
                console.log('📊 GIRO DEL CLIENTE:', clienteData.giro);
                
                break;
            }
        }
        
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
        const url = `https://docs.google.com/spreadsheets/d/${ID_PRODUCTOS}/gviz/tq?tqx=out:json&sheet=${HOJA_PRODUCTOS}`;
        const response = await fetch(url);
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
        
        for (let i = 1; i < rows.length; i++) {
            const values = rows[i].c.map(cell => cell ? cell.v : '');
            
            const clave = String(values[0] || '').trim();
            const nombre = String(values[1] || '').trim();
            
            if (!clave || !nombre) {
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

async function cargarPreciosEspeciales() {
    try {
        const url = `https://docs.google.com/spreadsheets/d/${ID_ARCHIVO_PRECIOS_ESPECIALES}/gviz/tq?tqx=out:json&sheet=${HOJA_PRECIOS_ESPECIALES}`;
        const response = await fetch(url);
        const text = await response.text();
        const jsonStr = text.substring(text.indexOf('(') + 1, text.lastIndexOf(')'));
        const data = JSON.parse(jsonStr);
        const rows = data.table.rows;
        
        preciosEspecialesGlobales = [];
        for (let i = 1; i < rows.length; i++) {
            const values = rows[i].c.map(cell => cell ? cell.v : '');
            const activo = String(values[7] || '').trim().toUpperCase();
            if (activo === 'TRUE' || activo === 'VERDADERO') {
                preciosEspecialesGlobales.push({
                    id: String(values[0] || '').trim(),
                    codigoCliente: String(values[1] || '').trim(),
                    nombreCliente: String(values[2] || '').trim(),
                    claveProducto: String(values[3] || '').trim(),
                    nombreProducto: String(values[4] || '').trim(),
                    precioPersonalizado: parseFloat(values[5]) || 0,
                    fechaRegistro: String(values[6] || '').trim()
                });
            }
        }
        console.log('💰 Precios especiales cargados:', preciosEspecialesGlobales.length);
    } catch (error) {
        console.error('Error al cargar precios especiales:', error);
    }
}

// ============================================
// FUNCIONES DE DIRECCIONES
// ============================================

async function cargarDireccionesCliente() {
    try {
        const codigoCliente = sessionStorage.getItem('codigoCliente');
        if (!codigoCliente) {
            console.warn('⚠️ No hay código de cliente disponible');
            return;
        }
        
        console.log('📥 Cargando direcciones para cliente:', codigoCliente);
        
        const url = `https://docs.google.com/spreadsheets/d/${ID_BASE_CLIENTES}/gviz/tq?tqx=out:json&sheet=${HOJA_DIRECCIONES}`;
        console.log('📥 URL:', url);
        
        const response = await fetch(url);
        const text = await response.text();
        
        console.log('📥 Respuesta recibida, longitud:', text.length);
        
        const jsonStr = text.substring(text.indexOf('(') + 1, text.lastIndexOf(')'));
        const data = JSON.parse(jsonStr);
        const rows = data.table.rows;
        
        console.log(`📊 Filas en la hoja Direcciones: ${rows.length}`);
        
        direccionesCliente = [];
        
        for (let i = 0; i < rows.length; i++) {
            const values = rows[i].c.map(cell => cell ? cell.v : '');
            const codigo = String(values[0] || '').trim();
            const filaReal = i + 1;
            
            if (codigo === codigoCliente) {
                const nombre = String(values[1] || '').trim();
                console.log(`✅ Dirección encontrada: "${nombre}" en fila REAL ${filaReal}`);
                
                direccionesCliente.push({
                    fila: filaReal,
                    codigo: codigo,
                    nombre: nombre || 'Sin nombre',
                    calle: String(values[2] || '').trim(),
                    colonia: String(values[3] || '').trim(),
                    alcaldia: String(values[4] || '').trim(),
                    estado: String(values[5] || '').trim(),
                    cp: String(values[6] || '').trim(),
                    mapsUrl: String(values[7] || '').trim(),
                    telefono: String(values[8] || '').trim(),
                    nombreRecibe: String(values[9] || '').trim()
                });
            }
        }
        
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
        const tienePersonalizado = precioFinal.personalizado;
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
                ${tienePersonalizado ? '<span class="precio-personalizado">⭐ Precio Personalizado</span>' : ''}
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
// PRECIOS Y DESCUENTOS
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
// FUNCIONES DE CARRITO
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
                    ${item.personalizado ? '<span class="precio-personalizado">⭐ Personalizado</span>' : ''}
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
    
    document.getElementById('modalDireccion').classList.add('active');
}

function cargarDireccionSeleccionada() {
    const select = document.getElementById('direccionSelector');
    const index = parseInt(select.value);
    if (isNaN(index) || index < 0 || index >= direccionesCliente.length) {
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
    let nombreDireccion = document.getElementById('dirGuardarNombre').value.trim();
    
    const select = document.getElementById('direccionSelector');
    const index = parseInt(select.value);
    if (!isNaN(index) && index >= 0 && index < direccionesCliente.length) {
        nombreDireccion = direccionesCliente[index].nombre;
    }
    
    if (guardarDireccion && !nombreDireccion) {
        mostrarMensajeModalDireccion('error', '⚠️ Por favor, asigna un nombre a la dirección para guardarla.');
        return;
    }
    
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
    abrirModalPago();
}

function mostrarMensajeModalDireccion(tipo, mensaje) {
    const div = document.getElementById('modalDireccionMensaje');
    div.className = tipo === 'exito' ? 'mensaje-exito' : 'mensaje-error';
    div.innerHTML = mensaje;
    div.style.display = 'block';
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
        
        const infoCredito = window._infoCredito || infoCreditoCalculado;
        const esCreditoParcial = window._esCreditoParcial || false;
        const montoExcedente = window._montoExcedente || 0;
        
        if (esCreditoParcial && infoCredito && infoCredito.excedeLimite) {
            const mensajeHTML = `
                <div style="background: #fef3c7; padding: 1rem; border-radius: 12px; margin-bottom: 1rem; border: 1px solid #fde68a;">
                    <p style="margin: 0; font-weight: 600; color: #92400e;">
                        ⚠️ Excedes el límite de crédito
                    </p>
                    <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; color: #92400e;">
                        <strong>Monto a pagar (excedente):</strong> ${formatoMexicano(montoExcedente)}
                        <br>
                        <strong>Monto a crédito:</strong> ${formatoMexicano(infoCredito.montoCredito)}
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
                document.getElementById('montoTransferencia').textContent = formatoMexicano(montoExcedente);
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

function cargarComprobante(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        comprobanteBase64 = e.target.result.split(',')[1];
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
            if (producto.personalizado) {
                precioInfo = `${formatoMexicano(producto.precio)} <span class="precio-personalizado">PERSONALIZADO</span>`;
            }
            
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
// ⭐ FUNCIÓN PARA ENVIAR CORREO CON ADJUNTO VÍA APPS SCRIPT
// ============================================

async function enviarCorreoConAdjuntoAppsScript(datos) {
    try {
        const APPS_SCRIPT_EMAIL_URL = 'https://script.google.com/macros/s/AKfycbzxjyFsLB6go3gcMz1qPNou1HhxsugQoiLvKPl0GAwLOQJZKdEcOyK-QxFU64WukWCY/exec';
        
        console.log('📧 Enviando correo con adjunto vía Apps Script...');
        
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
        
        const payload = {
            action: 'enviarCorreoAdjunto',
            email: 'ventas@proconstruccionmx.com',
            asunto: `NUEVA VENTA WEB - ${datos.folio} - ${datos.cliente.nombre}`,
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
            anio: new Date().getFullYear(),
            direccion_nombre: datos.nombreDireccion || 'Sin nombre',
            direccion_calle: datos.direccion ? datos.direccion.calle : '',
            direccion_colonia: datos.direccion ? datos.direccion.colonia : '',
            direccion_alcaldia: datos.direccion ? datos.direccion.alcaldia : '',
            direccion_estado: datos.direccion ? datos.direccion.estado : '',
            direccion_cp: datos.direccion ? datos.direccion.cp : '',
            direccion_telefono: datos.direccion ? datos.direccion.telefono : '',
            direccion_recibe: datos.direccion ? datos.direccion.nombreRecibe : '',
            requiere_factura: datos.requiereFactura || false,
            factura_razon_social: datos.datosFactura ? datos.datosFactura.razonSocial : '',
            factura_rfc: datos.datosFactura ? datos.datosFactura.rfc : ''
        };
        
        console.log('📤 Enviando a Apps Script:', payload);
        
        await fetch(APPS_SCRIPT_EMAIL_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        console.log('✅ Correo enviado con adjunto a ventas@proconstruccionmx.com');
        return { success: true };
        
    } catch (error) {
        console.error('❌ Error al enviar correo con adjunto:', error);
        return { success: false, error: error.toString() };
    }
}

// ============================================
// ⭐ FUNCIÓN PARA ENVIAR CORREO DE PAGO DE CRÉDITO (BONITO - SIN EMOJIS)
// ============================================

async function enviarCorreoPagoCreditoBonito(datos) {
    try {
        const APPS_SCRIPT_EMAIL_URL = 'https://script.google.com/macros/s/AKfycbzxjyFsLB6go3gcMz1qPNou1HhxsugQoiLvKPl0GAwLOQJZKdEcOyK-QxFU64WukWCY/exec';
        
        console.log('📧 Enviando correo de PAGO DE CREDITO con formato bonito...');
        
        // Generar tabla de productos en HTML
        let tablaProductosHTML = '';
        if (datos.productos && datos.productos.length > 0) {
            tablaProductosHTML = `
                <table style="width:100%; border-collapse:collapse; font-family:Arial, sans-serif; font-size:14px;">
                    <thead>
                        <tr style="background:#2a3990; color:white;">
                            <th style="padding:10px 12px; text-align:left; border:1px solid #ddd;">Producto</th>
                            <th style="padding:10px 12px; text-align:center; border:1px solid #ddd;">Cantidad</th>
                            <th style="padding:10px 12px; text-align:right; border:1px solid #ddd;">Importe</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            datos.productos.forEach(p => {
                const importe = p.importe || 0;
                const cantidad = p.cantidad || 0;
                const nombre = p.nombre || 'Sin nombre';
                tablaProductosHTML += `
                    <tr>
                        <td style="padding:8px 12px; border:1px solid #ddd;">${nombre}</td>
                        <td style="padding:8px 12px; text-align:center; border:1px solid #ddd;">${cantidad}</td>
                        <td style="padding:8px 12px; text-align:right; border:1px solid #ddd;">$${Number(importe).toFixed(2)}</td>
                    </tr>
                `;
            });
            tablaProductosHTML += `
                    </tbody>
                </table>
            `;
        } else {
            tablaProductosHTML = '<p style="color:#666;">No hay productos en esta venta.</p>';
        }
        
        const fechaFormateada = datos.fecha ? datos.fecha.toLocaleString('es-MX') : new Date().toLocaleString('es-MX');
        const monto = Number(datos.monto || 0).toFixed(2);
        const clienteNombre = datos.cliente ? datos.cliente.nombre : 'Sin nombre';
        const clienteCodigo = datos.cliente ? datos.cliente.codigo : 'Sin codigo';
        
        // HTML del correo con formato bonito - SIN EMOJIS
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 12px;">
                <div style="background: linear-gradient(135deg, #0A2540 0%, #1a4d8c 100%); padding: 25px 30px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px; letter-spacing: 1px;">PAGO DE CREDITO</h1>
                    <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0; font-size: 14px;">Folio original: <strong style="color: #F5A623;">${datos.idVenta}</strong></p>
                </div>
                
                <div style="background: white; padding: 25px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    <!-- Datos del cliente -->
                    <div style="background: #f0f4f8; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="color: #0A2540; margin: 0 0 10px 0; font-size: 16px;">Datos del Cliente</h3>
                        <p style="margin: 3px 0; font-size: 14px; color: #333;"><strong>Nombre:</strong> ${clienteNombre}</p>
                        <p style="margin: 3px 0; font-size: 14px; color: #333;"><strong>Codigo:</strong> ${clienteCodigo}</p>
                        <p style="margin: 3px 0; font-size: 14px; color: #333;"><strong>Fecha:</strong> ${fechaFormateada}</p>
                    </div>
                    
                    <!-- Monto liquidado -->
                    <div style="background: #dcfce7; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #bbf7d0;">
                        <p style="margin: 0; font-size: 18px; font-weight: bold; color: #16a34a; text-align: center;">
                            Monto liquidado: $${monto}
                        </p>
                    </div>
                    
                    <!-- Detalles del pago -->
                    <div style="background: #fef3c7; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #fde68a;">
                        <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">Detalles del Pago</h3>
                        <p style="margin: 3px 0; font-size: 14px; color: #92400e;"><strong>Venta original:</strong> ${datos.idVenta}</p>
                        <p style="margin: 3px 0; font-size: 14px; color: #92400e;"><strong>Referencia:</strong> ${datos.referencia}</p>
                        <p style="margin: 3px 0; font-size: 14px; color: #92400e;"><strong>Comprobante:</strong> ${datos.comprobanteNombre || 'No adjunto'}</p>
                    </div>
                    
                    <!-- Productos -->
                    <div style="margin-bottom: 20px;">
                        <h3 style="color: #0A2540; margin: 0 0 10px 0; font-size: 16px;">Productos de la venta</h3>
                        ${tablaProductosHTML}
                    </div>
                    
                    <!-- Footer -->
                    <div style="border-top: 2px solid #e2e8f0; padding-top: 15px; text-align: center;">
                        <p style="margin: 0; color: #4a5568; font-size: 13px;">
                            <strong style="color: #0A2540;">ProConstruccion MX</strong> 
                            <span style="color: #F5A623;">|</span> 
                            ventas@proconstruccionmx.com
                        </p>
                        <p style="margin: 5px 0 0 0; font-size: 12px; color: #a0aec0;">
                            Este es un correo automatico de confirmacion de pago.
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        // Texto plano como alternativa
        const textoPlano = `
PAGO DE CREDITO
===============

Folio original: ${datos.idVenta}
Cliente: ${clienteNombre}
Codigo: ${clienteCodigo}
Fecha: ${fechaFormateada}

Monto liquidado: $${monto}
Referencia: ${datos.referencia}
Comprobante: ${datos.comprobanteNombre || 'No adjunto'}

Productos:
${datos.productos ? datos.productos.map(p => `- ${p.nombre} x ${p.cantidad} = $${(p.importe || 0).toFixed(2)}`).join('\n') : 'No hay productos'}

---
ProConstruccion MX
ventas@proconstruccionmx.com
        `;
        
        // Enviar a Apps Script
        const payload = {
            action: 'enviarCorreoPagoCreditoBonito',
            email: 'ventas@proconstruccionmx.com',
            asunto: `PAGO DE CREDITO - ${datos.idVenta} - ${clienteNombre}`,
            htmlContent: htmlContent,
            textoPlano: textoPlano,
            comprobanteBase64: datos.comprobante || null,
            comprobanteNombre: datos.comprobanteNombre || null,
            comprobanteTipo: datos.comprobanteTipo || 'image/jpeg'
        };
        
        console.log('📤 Enviando a Apps Script:', payload);
        
        await fetch(APPS_SCRIPT_EMAIL_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        console.log('✅ Correo de PAGO DE CREDITO enviado con formato bonito');
        return { success: true };
        
    } catch (error) {
        console.error('❌ Error al enviar correo de pago de crédito:', error);
        return { success: false, error: error.toString() };
    }
}

// ============================================
// ⭐ FUNCIÓN PARA MARCAR COLUMNA P EN CLIENTES
// ============================================

async function marcarColumnaPCliente(idVenta) {
    try {
        console.log(`📝 Buscando fila con ID de venta: ${idVenta} en Clientes para marcar columna P`);
        
        const url = `https://docs.google.com/spreadsheets/d/${ID_ESTADISTICAS}/gviz/tq?tqx=out:json&sheet=${HOJA_EST_CLIENTES}`;
        const response = await fetch(url);
        const text = await response.text();
        const jsonStr = text.substring(text.indexOf('(') + 1, text.lastIndexOf(')'));
        const data = JSON.parse(jsonStr);
        const rows = data.table.rows;
        
        let filaEncontrada = false;
        let filaReal = null;
        
        for (let i = 1; i < rows.length; i++) {
            const values = rows[i].c.map(cell => cell ? cell.v : '');
            const idVentaFila = String(values[1] || '').trim();
            
            if (idVentaFila === idVenta) {
                filaReal = i + 1;
                filaEncontrada = true;
                console.log(`✅ Encontrada fila ${filaReal} para ID ${idVenta}`);
                break;
            }
        }
        
        if (!filaEncontrada) {
            console.warn(`⚠️ No se encontró fila para ID ${idVenta} en Clientes`);
            return { success: false, mensaje: 'No se encontró la venta en Clientes' };
        }
        
        // ⭐ Enviar a Apps Script para marcar columna P (índice 16)
        const body = {
            action: 'marcarColumnaPCliente',
            fila: filaReal,
            idVenta: idVenta,
            valor: 'SI'
        };
        
        console.log('📤 Enviando a Apps Script:', body);
        
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });
        
        console.log(`✅ Columna P marcada como SI para venta ${idVenta}`);
        return { success: true, fila: filaReal };
        
    } catch (error) {
        console.error('❌ Error al marcar columna P:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// ⭐ PROCESAR PAGO DE CRÉDITO PENDIENTE (SOLO CORREO + COLUMNA P)
// ============================================

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
    }
    
    try {
        const venta = creditoSeleccionadoParaPago;
        const idVenta = venta.idVenta;
        const saldoPendiente = venta.saldoPendiente || venta.total || 0;
        const folioOriginal = venta.idVenta;
        
        console.log(`📝 Liquidando crédito para venta: ${idVenta}`);
        console.log(`💰 Monto a liquidar: ${saldoPendiente}`);
        
        // ⭐ 1. MARCAR COLUMNA P EN CLIENTES CON "SI"
        await marcarColumnaPCliente(idVenta);
        
        // ⭐ 2. ENVIAR CORREO DE PAGO DE CRÉDITO (con formato bonito)
        await enviarCorreoPagoCreditoBonito({
            idVenta: idVenta,
            folio: folioOriginal,
            cliente: clienteData,
            monto: saldoPendiente,
            referencia: referencia,
            comprobante: comprobanteCreditoBase64,
            comprobanteNombre: comprobanteCreditoNombre,
            fecha: new Date(),
            productos: venta.productos || []
        });
        
        // ⭐ 3. GENERAR COMPROBANTE DE PAGO
        const datosComprobante = {
            folio: `PAGO-${folioOriginal}`,
            fecha: new Date(),
            cliente: clienteData,
            productos: venta.productos || [],
            total: saldoPendiente,
            subtotal: saldoPendiente / 1.16,
            iva: saldoPendiente - (saldoPendiente / 1.16),
            tipoPago: 'Transferencia (Liquidación Crédito)',
            referencia: referencia,
            comprobante: comprobanteCreditoBase64,
            comprobanteNombre: comprobanteCreditoNombre,
            comprobanteTipo: 'image/*',
            requiereFactura: false,
            datosFactura: null,
            nombreDireccion: 'Liquidación de crédito',
            esLiquidacionCredito: true,
            idVentaOriginal: folioOriginal
        };
        generarPDFComprobante(datosComprobante);
        
        mostrarMensajeModalPagoCredito('exito', `
            ✅ ¡Pago registrado con éxito!<br>
            <strong>Venta original:</strong> ${folioOriginal}<br>
            <strong>Monto liquidado:</strong> ${formatoMexicano(saldoPendiente)}<br>
            <strong>Referencia:</strong> ${referencia}<br><br>
            Se ha enviado un correo a ventas@proconstruccionmx.com con los detalles.
        `);
        
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '✅ Pago registrado';
        }
        
        // ⭐ Recargar historial para actualizar la vista
        setTimeout(() => {
            cerrarModalPagoCredito();
            cargarHistorialCompras();
        }, 5000);
        
    } catch (error) {
        console.error('Error al procesar pago:', error);
        mostrarMensajeModalPagoCredito('error', '❌ Error al procesar el pago: ' + error.message);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Confirmar Pago';
        }
    }
}

// ============================================
// ⭐ FUNCIONES PARA "MIS COMPRAS" - HISTORIAL
// ============================================

async function cargarHistorialCompras() {
    try {
        const codigoCliente = sessionStorage.getItem('codigoCliente');
        if (!codigoCliente) {
            console.warn('⚠️ No hay código de cliente disponible');
            return;
        }
        
        console.log('📥 Cargando historial de compras para cliente:', codigoCliente);
        
        const urlClientes = `https://docs.google.com/spreadsheets/d/${ID_ESTADISTICAS}/gviz/tq?tqx=out:json&sheet=${HOJA_EST_CLIENTES}`;
        const responseClientes = await fetch(urlClientes);
        const textClientes = await responseClientes.text();
        const jsonStrClientes = textClientes.substring(textClientes.indexOf('(') + 1, textClientes.lastIndexOf(')'));
        const dataClientes = JSON.parse(jsonStrClientes);
        const rowsClientes = dataClientes.table.rows;
        
        const idsVenta = [];
        const ventasMap = new Map();
        
        for (let i = 1; i < rowsClientes.length; i++) {
            const values = rowsClientes[i].c.map(cell => cell ? cell.v : '');
            const codigo = String(values[2] || '').trim();
            const idVenta = String(values[1] || '').trim();
            let fecha = values[0];
            if (fecha && typeof fecha === 'object' && fecha.v !== undefined) {
                fecha = fecha.v;
            }
            const total = parseFloat(values[4]) || 0;
            const estado = String(values[12] || '').trim();
            const formaPago = String(values[9] || '').trim();
            const creditoPendiente = parseFloat(values[5]) || 0;
            const montoPagado = parseFloat(values[6]) || 0;
            const columnaP = String(values[15] || '').trim().toUpperCase(); // Columna P (índice 15)
            
            if (codigo === codigoCliente && idVenta) {
                idsVenta.push(idVenta);
                const fechaObj = parseFechaGoogleSheets(fecha);
                ventasMap.set(idVenta, {
                    idVenta: idVenta,
                    fecha: fecha,
                    fechaObj: fechaObj,
                    total: total,
                    estado: estado || 'Validando pago',
                    codigoCliente: codigo,
                    tipoPago: formaPago,
                    saldoPendiente: creditoPendiente,
                    montoPagado: montoPagado,
                    anticipo: montoPagado,
                    columnaP: columnaP === 'SI'
                });
            }
        }
        
        console.log(`📦 IDs de venta encontrados: ${idsVenta.length}`);
        
        if (idsVenta.length === 0) {
            renderizarHistorialVacio();
            return;
        }
        
        const urlProductos = `https://docs.google.com/spreadsheets/d/${ID_ESTADISTICAS}/gviz/tq?tqx=out:json&sheet=${HOJA_EST_PRODUCTOS}`;
        const responseProductos = await fetch(urlProductos);
        const textProductos = await responseProductos.text();
        const jsonStrProductos = textProductos.substring(textProductos.indexOf('(') + 1, textProductos.lastIndexOf(')'));
        const dataProductos = JSON.parse(jsonStrProductos);
        const rowsProductos = dataProductos.table.rows;
        
        const productosPorVenta = new Map();
        const contadorProductos = new Map();
        
        for (let i = 1; i < rowsProductos.length; i++) {
            const values = rowsProductos[i].c.map(cell => cell ? cell.v : '');
            const idVenta = String(values[1] || '').trim();
            const nombreProducto = String(values[2] || '').trim();
            const cantidad = parseFloat(values[3]) || 0;
            const importe = parseFloat(values[4]) || 0;
            const creditoPendiente = parseFloat(values[7]) || 0;
            const montoPagado = parseFloat(values[8]) || 0;
            const diasCredito = parseFloat(values[9]) || 0;
            const fechaPagoStr = String(values[10] || '').trim();
            
            if (idsVenta.includes(idVenta) && nombreProducto) {
                if (!productosPorVenta.has(idVenta)) {
                    productosPorVenta.set(idVenta, []);
                }
                productosPorVenta.get(idVenta).push({
                    nombre: nombreProducto,
                    cantidad: cantidad,
                    importe: importe
                });
                
                if (!ventasMap.has(idVenta)) {
                    ventasMap.set(idVenta, {});
                }
                const ventaInfo = ventasMap.get(idVenta);
                ventaInfo.diasCredito = diasCredito || ventaInfo.diasCredito || 0;
                if (fechaPagoStr && !ventaInfo.fechaPago) {
                    ventaInfo.fechaPago = fechaPagoStr;
                }
                
                if (contadorProductos.has(nombreProducto)) {
                    const data = contadorProductos.get(nombreProducto);
                    data.cantidad += cantidad;
                    data.veces++;
                    data.totalImporte += importe;
                } else {
                    contadorProductos.set(nombreProducto, {
                        nombre: nombreProducto,
                        cantidad: cantidad,
                        veces: 1,
                        totalImporte: importe
                    });
                }
            }
        }
        
        historialVentas = [];
        
        for (const [idVenta, info] of ventasMap) {
            const productos = productosPorVenta.get(idVenta) || [];
            const subtotal = productos.reduce((sum, p) => sum + p.importe, 0);
            historialVentas.push({
                ...info,
                productos: productos,
                subtotal: subtotal,
                iva: subtotal * 0.16,
                totalConIva: subtotal * 1.16,
                fechaPago: info.fechaPago || null,
                diasCredito: info.diasCredito || 0,
                columnaP: info.columnaP || false
            });
        }
        
        historialVentas.sort((a, b) => {
            const fechaA = a.fechaObj || parseFechaGoogleSheets(a.fecha);
            const fechaB = b.fechaObj || parseFechaGoogleSheets(b.fecha);
            if (!fechaA && !fechaB) return 0;
            if (!fechaA) return 1;
            if (!fechaB) return -1;
            return fechaB - fechaA;
        });
        
        productosMasComprados = Array.from(contadorProductos.values());
        productosMasComprados.sort((a, b) => b.totalImporte - a.totalImporte);
        
        console.log(`📦 Historial cargado: ${historialVentas.length} ventas`);
        
        renderizarOrdenes();
        renderizarHistorialCompras();
        renderizarEstadisticasProductos();
        cargarCreditosPendientes();
        
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
// ⭐ FUNCIONES PARA CRÉDITOS PENDIENTES
// ============================================

function cargarCreditosPendientes() {
    console.log('📋 Cargando créditos pendientes...');
    
    const container = document.getElementById('creditosPendientesContent');
    if (!container) return;
    
    creditosPendientes = historialVentas.filter(v => {
        const tipoPago = v.tipoPago || '';
        const saldoPendiente = v.saldoPendiente || v.total || 0;
        return (tipoPago === 'Crédito' || tipoPago === 'Crédito Parcial') && saldoPendiente > 0.01;
    });
    
    console.log(`📊 Créditos pendientes encontrados: ${creditosPendientes.length}`);
    
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
    
    creditosPendientes.forEach((venta, index) => {
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
        
        // ⭐ VERIFICAR SI LA COLUMNA P ESTÁ EN "SI" - Mostrar "Validando pago"
        let estadoTexto = 'Pendiente';
        if (venta.columnaP === true) {
            estadoTexto = 'Validando pago';
        } else if (estaVencido) {
            estadoTexto = 'VENCIDO';
        }
        
        html += `
            <div style="background:white; border-radius:12px; padding:1.2rem; border:1px solid ${estaVencido && !venta.columnaP ? '#fecaca' : '#fef3c7'}; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:0.5rem;">
                    <div>
                        <span style="font-weight:700; color:var(--primary-dark); font-size:1rem;">${venta.idVenta}</span>
                        <span style="font-size:0.75rem; color:var(--text-gray); margin-left:0.5rem;">${fechaFormateada}</span>
                        <div style="font-size:0.8rem; color:var(--text-gray); margin-top:0.2rem;">
                            <span class="badge badge-warning">${venta.tipoPago || 'Crédito'}</span>
                            ${estaVencido && !venta.columnaP ? '<span class="badge badge-danger" style="margin-left:0.5rem;">VENCIDO</span>' : ''}
                            ${venta.diasCredito ? `<span style="font-size:0.7rem; color:var(--text-gray); margin-left:0.5rem;">${venta.diasCredito} días</span>` : ''}
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-weight:700; color:${estaVencido && !venta.columnaP ? '#dc2626' : '#92400e'}; font-size:1.1rem;">
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

// ============================================
// FUNCIONES PARA MODAL DE PAGO DE CRÉDITO PENDIENTE
// ============================================

let comprobanteCreditoBase64 = null;
let comprobanteCreditoNombre = null;

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

function cargarComprobanteCredito(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        comprobanteCreditoBase64 = e.target.result.split(',')[1];
        comprobanteCreditoNombre = file.name;
        document.getElementById('fileNameCredito').textContent = file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
        validarCamposCreditoPendiente();
    };
    reader.readAsDataURL(file);
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
        });
    });
}
