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

// ⭐ URL DEL APPS SCRIPT (ACTUALIZADA) ⭐
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby1yrHy1Ob7HijY1lR84L4ab9PSVQRVT2isLQka8meQ5RMSSoQ7xcyoFf6RFneE7CXt/exec';

// ⭐ URL DEL SCRIPT DE FACTURACIÓN ⭐
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

// ⭐ VARIABLES PARA "MIS COMPRAS" ⭐
let historialVentas = [];
let ventasDetalladas = [];
let productosMasComprados = [];

// ⭐ VARIABLES PARA CRÉDITO ⭐
let clienteCreditoHabilitado = false;
let clienteLimiteCreditoPeso = 0;
let clienteLimiteCreditoMonto = 0;

// ============================================
// ⭐ FUNCIÓN PARA PARSEAR FECHAS CORRECTAMENTE ⭐
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
        
        console.log(`✅ Fila guardada en ${sheetName}`);
        return { success: true };
    } catch (error) {
        console.error('Error al guardar fila:', error);
        return { success: false, error: error.toString() };
    }
}

// ============================================
// ⭐ FUNCIONES DE FACTURACIÓN ⭐
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
                // ⭐ NUEVAS COLUMNAS: N, O, P
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
                    // ⭐ NUEVAS PROPIEDADES
                    creditoHabilitado: creditoHabilitado,
                    limiteCreditoPeso: parseFloat(values[14]) || 0, // Columna O
                    limiteCreditoMonto: parseFloat(values[15]) || 0  // Columna P
                };
                
                // ⭐ GUARDAR EN VARIABLES GLOBALES
                clienteCreditoHabilitado = clienteData.creditoHabilitado;
                clienteLimiteCreditoPeso = clienteData.limiteCreditoPeso;
                clienteLimiteCreditoMonto = clienteData.limiteCreditoMonto;
                
                console.log('💳 CRÉDITO HABILITADO:', clienteCreditoHabilitado);
                console.log('⚖️ LÍMITE CRÉDITO PESO:', clienteLimiteCreditoPeso, 'kg');
                console.log('💰 LÍMITE CRÉDITO MONTO:', clienteLimiteCreditoMonto);
                
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
        
        productosGlobales = [];
        let contadorConPeso = 0;
        
        for (let i = 2; i < rows.length; i++) {
            const values = rows[i].c.map(cell => cell ? cell.v : '');
            
            const clave = String(values[0] || '').trim();
            const nombre = String(values[1] || '').trim();
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
            
            if (pesoCondicion === 'SI' && peso > 0) {
                contadorConPeso++;
                console.log(`🔴 [PESO] Producto: "${nombre}" | Clave: "${clave}" | Condición: "${pesoCondicionRaw}" → ${pesoCondicion} | Peso: ${peso} kg`);
            }
            
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
                peso: peso
            });
        }
        
        console.log(`📦 Productos cargados: ${productosGlobales.length}`);
        console.log(`⚖️ Productos con condición de peso (SI): ${contadorConPeso}`);
        
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
// ⭐ FUNCIONES DE DIRECCIONES ⭐
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
        const resultado = await actualizarDireccionEnSheets(fila, datosActualizados);
        console.log('📝 Resultado de Apps Script (simulado):', resultado);
        
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
        const resultado = await eliminarDireccionEnSheets(dir.fila);
        console.log('🗑️ Resultado de Apps Script (simulado):', resultado);
        
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
        
        const resultado = await agregarDireccionEnSheets(nuevaDireccion);
        
        if (resultado.success) {
            mostrarNotificacion('✅ Dirección guardada correctamente');
            await cargarDireccionesCliente();
            return true;
        } else {
            mostrarNotificacion('❌ Error al guardar: ' + (resultado.error || 'Intenta de nuevo'));
            return false;
        }
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
        p.nombre.toLowerCase().includes(query) || 
        p.clave.toLowerCase().includes(query) ||
        p.descripcion.toLowerCase().includes(query)
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
        
        html += `
            <div class="product-card">
                <span class="clave">${producto.clave}</span>
                ${producto.pxv === 'PXV' ? '<span class="tag-pxv">📦 Descuento por Volumen</span>' : ''}
                ${etiquetaPeso}
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
    if (!isNaN(naNumero) && producto.na !== '-') {
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
        
        return mapGiro[giro] || 0;
    }
    
    if (producto.na === '' && producto.pxv === 'PXV') {
        const giro = clienteData.giro || 'Público en general';
        const girosPXV = ['Distribuidor', 'Arquitecto', 'Inmobiliaria', 'Constructora'];
        
        if (girosPXV.includes(giro)) {
            if (cantidad >= 250) {
                return producto.descuentoVolumenQ;
            }
            if (cantidad >= 150) {
                return producto.descuentoVolumenP;
            }
        }
    }
    
    return clienteData.descuento || 0;
}

// ============================================
// ⭐ VERIFICACIÓN DE CRÉDITO Y PESO MÍNIMO ⭐
// ============================================

function verificarCreditoDisponible() {
    console.log('🔍 Verificando crédito disponible...');
    console.log('💳 Cliente crédito habilitado:', clienteCreditoHabilitado);
    console.log('⚖️ Límite crédito peso:', clienteLimiteCreditoPeso);
    console.log('💰 Límite crédito monto:', clienteLimiteCreditoMonto);
    
    // Separar productos con peso y sin peso
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
    
    // Calcular peso total de productos con peso
    let pesoTotal = 0;
    productosConPeso.forEach(item => {
        const producto = productosGlobales.find(p => p.clave === item.clave);
        if (producto) {
            pesoTotal += producto.peso * item.cantidad;
        }
    });
    
    // Calcular monto total de productos sin peso
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
    
    // Calcular monto total de productos con peso (para el pago restante)
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
    
    const totalGeneral = montoConPeso + montoSinPeso;
    
    console.log(`⚖️ Peso total (con peso): ${pesoTotal.toFixed(2)} kg`);
    console.log(`💰 Monto productos con peso: ${formatoMexicano(montoConPeso)}`);
    console.log(`💰 Monto productos sin peso: ${formatoMexicano(montoSinPeso)}`);
    console.log(`💰 Total general: ${formatoMexicano(totalGeneral)}`);
    
    // Verificar si hay productos con peso
    const hayProductosConPeso = productosConPeso.length > 0;
    const hayProductosSinPeso = productosSinPeso.length > 0;
    
    // CASO 1: Solo productos con peso
    if (hayProductosConPeso && !hayProductosSinPeso) {
        console.log('📦 Caso: Solo productos con peso');
        
        if (pesoTotal <= clienteLimiteCreditoPeso) {
            // Todo va a crédito
            return {
                puedeCredito: true,
                tipo: 'credito_total',
                mensaje: `✅ Todos los productos van a crédito. Peso total: ${pesoTotal.toFixed(2)} kg (límite: ${clienteLimiteCreditoPeso} kg)`,
                pesoTotal: pesoTotal,
                montoCredito: totalGeneral,
                montoPago: 0,
                productosCredito: carrito,
                productosPago: []
            };
        } else {
            // Calcular cuántos kg van a crédito y cuántos a pago
            // Usar la proporción para determinar qué productos van a pago
            const pesoExcedente = pesoTotal - clienteLimiteCreditoPeso;
            const proporcionPago = pesoExcedente / pesoTotal;
            
            // Seleccionar productos para pago (los que cubran el excedente)
            let pesoAcumulado = 0;
            let productosPago = [];
            let productosCredito = [];
            let montoPago = 0;
            let montoCredito = 0;
            
            // Ordenar productos por peso (de mayor a menor) para optimizar
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
                    // Este producto va a pago
                    productosPago.push(item);
                    montoPago += importe;
                    pesoAcumulado += pesoItem;
                } else {
                    // Dividir el producto
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
            
            // Los productos restantes van a crédito
            for (const item of productosConPeso) {
                if (!productosPago.some(p => p.clave === item.clave && p._parcial === true) && 
                    !productosPago.some(p => p.clave === item.clave && p._parcial !== true)) {
                    const producto = productosGlobales.find(p => p.clave === item.clave);
                    if (!producto) continue;
                    
                    const precioFinal = obtenerPrecioFinal(producto);
                    const descuento = calcularDescuentoProducto(producto, item.cantidad);
                    const importe = precioFinal.precio * item.cantidad * (1 - descuento / 100);
                    
                    // Verificar si este producto ya fue procesado parcialmente
                    const yaProcesado = productosPago.some(p => p.clave === item.clave) || 
                                       productosCredito.some(p => p.clave === item.clave);
                    
                    if (!yaProcesado) {
                        productosCredito.push(item);
                        montoCredito += importe;
                    }
                }
            }
            
            return {
                puedeCredito: true,
                tipo: 'credito_parcial',
                mensaje: `⚠️ Excedes el límite de crédito. ${formatoMexicano(montoPago)} deben pagarse. El resto va a crédito.`,
                pesoTotal: pesoTotal,
                pesoExcedente: pesoExcedente,
                montoCredito: montoCredito,
                montoPago: montoPago,
                productosCredito: productosCredito,
                productosPago: productosPago
            };
        }
    }
    
    // CASO 2: Solo productos sin peso
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
                productosPago: []
            };
        } else {
            // Calcular cuánto va a crédito y cuánto a pago
            const montoExcedente = montoSinPeso - clienteLimiteCreditoMonto;
            const proporcionPago = montoExcedente / montoSinPeso;
            
            let montoAcumulado = 0;
            let productosPago = [];
            let productosCredito = [];
            let montoPago = 0;
            let montoCredito = 0;
            
            // Ordenar productos por precio (de mayor a menor)
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
            
            // Productos restantes a crédito
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
            
            return {
                puedeCredito: true,
                tipo: 'credito_parcial',
                mensaje: `⚠️ Excedes el límite de crédito. ${formatoMexicano(montoPago)} deben pagarse. El resto va a crédito.`,
                pesoTotal: 0,
                montoCredito: montoCredito,
                montoPago: montoPago,
                productosCredito: productosCredito,
                productosPago: productosPago
            };
        }
    }
    
    // CASO 3: Productos con peso y sin peso (mixto)
    if (hayProductosConPeso && hayProductosSinPeso) {
        console.log('📦 Caso: Productos mixtos (con peso y sin peso)');
        
        // Verificar si ambos límites se cumplen
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
                productosPago: []
            };
        } else {
            // Calcular qué excede y qué no
            let productosPago = [];
            let productosCredito = [];
            let montoPago = 0;
            let montoCredito = 0;
            let pesoExcedente = 0;
            let montoExcedente = 0;
            
            // Primero manejar productos con peso
            if (!pesoCumple) {
                const pesoExcedenteTotal = pesoTotal - clienteLimiteCreditoPeso;
                let pesoAcumulado = 0;
                
                // Ordenar productos con peso de mayor a menor
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
            
            // Luego manejar productos sin peso (si el crédito de monto ya está ocupado)
            if (!montoCumple) {
                const montoExcedenteTotal = montoSinPeso - clienteLimiteCreditoMonto;
                let montoAcumulado = 0;
                
                // Ordenar productos sin peso de mayor a menor precio
                const prodSinPesoOrdenados = [...productosSinPeso].sort((a, b) => {
                    const prodA = productosGlobales.find(p => p.clave === a.clave);
                    const prodB = productosGlobales.find(p => p.clave === b.clave);
                    const precioA = prodA ? prodA.precio * a.cantidad : 0;
                    const precioB = prodB ? prodB.precio * b.cantidad : 0;
                    return precioB - precioA;
                });
                
                for (const item of prodSinPesoOrdenados) {
                    // Verificar si ya fue procesado
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
            
            // Los productos restantes van a crédito
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
            
            // Recalcular montos totales
            const montoPagoTotal = productosPago.reduce((sum, item) => {
                const producto = productosGlobales.find(p => p.clave === item.clave);
                if (!producto) return sum;
                const precioFinal = obtenerPrecioFinal(producto);
                const descuento = calcularDescuentoProducto(producto, item.cantidad);
                return sum + (precioFinal.precio * item.cantidad * (1 - descuento / 100));
            }, 0);
            
            const montoCreditoTotal = productosCredito.reduce((sum, item) => {
                const producto = productosGlobales.find(p => p.clave === item.clave);
                if (!producto) return sum;
                const precioFinal = obtenerPrecioFinal(producto);
                const descuento = calcularDescuentoProducto(producto, item.cantidad);
                return sum + (precioFinal.precio * item.cantidad * (1 - descuento / 100));
            }, 0);
            
            return {
                puedeCredito: true,
                tipo: 'credito_parcial',
                mensaje: `⚠️ Excedes el límite de crédito. ${formatoMexicano(montoPagoTotal)} deben pagarse. El resto va a crédito.`,
                pesoTotal: pesoTotal,
                montoCredito: montoCreditoTotal,
                montoPago: montoPagoTotal,
                productosCredito: productosCredito,
                productosPago: productosPago
            };
        }
    }
    
    // Si no hay productos
    return {
        puedeCredito: false,
        tipo: 'sin_productos',
        mensaje: '⚠️ No hay productos en el carrito.',
        pesoTotal: 0,
        montoCredito: 0,
        montoPago: 0,
        productosCredito: [],
        productosPago: []
    };
}

// ============================================
// CARRITO
// ============================================

function agregarAlCarrito(clave) {
    const producto = productosGlobales.find(p => p.clave === clave);
    if (!producto) return;
    
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
            peso: producto.peso
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
    
    if (nuevaCantidad <= 0) {
        eliminarDelCarrito(clave);
        return;
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
// RENDERIZAR CARRITO CON INFORMACIÓN DE CRÉDITO
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
    
    // Verificar peso mínimo (siempre requerido)
    const verificarPeso = verificarPesoMinimo();
    
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
        
        html += `
            <tr>
                <td>
                    <strong>${item.nombre}</strong>
                    ${item.personalizado ? '<span class="precio-personalizado">⭐ Personalizado</span>' : ''}
                    ${pesoInfo}
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
    
    // Mostrar información de peso mínimo
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
    
    // Mostrar información de crédito (si el cliente tiene crédito habilitado)
    if (clienteCreditoHabilitado) {
        const infoCredito = verificarCreditoDisponible();
        
        if (infoCredito.tipo === 'credito_parcial') {
            html += `
                <div style="margin-top: 1.5rem; padding: 1.5rem; border-radius: 12px; background: #fef3c7; border: 2px solid #fde68a;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <span style="font-size: 1.5rem;">⚠️</span>
                        <span style="font-weight: 700; color: #92400e; font-size: 1.1rem;">
                            Crédito Parcial
                        </span>
                    </div>
                    <div style="background: white; padding: 0.8rem 1rem; border-radius: 8px; margin: 0.5rem 0;">
                        <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f0f0f0;">
                            <span>Monto a pagar (contado):</span>
                            <span style="font-weight: 700; color: #dc2626;">${formatoMexicano(infoCredito.montoPago)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                            <span>Monto a crédito:</span>
                            <span style="font-weight: 700; color: #16a34a;">${formatoMexicano(infoCredito.montoCredito)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 4px 0; border-top: 2px solid #e2e8f0; margin-top: 4px; padding-top: 8px; font-weight: 700;">
                            <span>TOTAL:</span>
                            <span style="color: var(--primary-dark);">${formatoMexicano(infoCredito.montoPago + infoCredito.montoCredito)}</span>
                        </div>
                    </div>
                    <div style="background: #fef3c7; padding: 0.8rem 1rem; border-radius: 8px; margin-top: 0.5rem; border: 1px solid #fde68a;">
                        <p style="margin: 0; font-weight: 600; color: #92400e; font-size: 0.95rem;">
                            ${infoCredito.mensaje}
                        </p>
                    </div>
                </div>
            `;
        } else if (infoCredito.tipo === 'credito_total') {
            html += `
                <div style="margin-top: 1.5rem; padding: 1.5rem; border-radius: 12px; background: #dcfce7; border: 2px solid #bbf7d0;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.5rem;">✅</span>
                        <span style="font-weight: 700; color: #16a34a; font-size: 1.1rem;">
                            ${infoCredito.mensaje}
                        </span>
                    </div>
                </div>
            `;
        }
    } else {
        // Cliente sin crédito habilitado
        html += `
            <div style="margin-top: 1.5rem; padding: 1.5rem; border-radius: 12px; background: #f1f5f9; border: 2px solid #e2e8f0;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 1.5rem;">ℹ️</span>
                    <span style="font-weight: 600; color: var(--text-gray); font-size: 1rem;">
                        El crédito no está habilitado para este cliente. Solo pago de contado (transferencia).
                    </span>
                </div>
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
    
    // Verificar si se puede realizar la compra
    if (verificarPeso.productosConPeso > 0 && !verificarPeso.cumple) {
        btnComprar.disabled = true;
        btnComprar.title = '⚠️ Debes completar el peso mínimo de 1 tonelada (1000 kg) para productos con peso.';
        btnComprar.style.opacity = '0.5';
        btnComprar.style.cursor = 'not-allowed';
    } else {
        btnComprar.disabled = false;
        btnComprar.title = '';
        btnComprar.style.opacity = '1';
        btnComprar.style.cursor = 'pointer';
    }
}

// ============================================
// VERIFICACIÓN DE PESO MÍNIMO (ORIGINAL)
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
// FUNCIONES DE PAGO - CON SOPORTE PARA CRÉDITO PARCIAL
// ============================================

function abrirModalPago() {
    const modal = document.getElementById('modalPago');
    modal.classList.add('active');
    
    document.getElementById('modalMensaje').innerHTML = '';
    document.getElementById('modalMensaje').style.display = 'none';
    document.getElementById('formTransferencia').style.display = 'none';
    document.getElementById('formCredito').style.display = 'none';
    
    // Calcular totales según el tipo de crédito
    let total = calcularTotal();
    let montoPago = total;
    let montoCredito = 0;
    let esCreditoParcial = false;
    let infoCredito = null;
    
    if (clienteCreditoHabilitado) {
        infoCredito = verificarCreditoDisponible();
        if (infoCredito.tipo === 'credito_parcial') {
            esCreditoParcial = true;
            montoPago = infoCredito.montoPago;
            montoCredito = infoCredito.montoCredito;
        } else if (infoCredito.tipo === 'credito_total') {
            montoPago = 0;
            montoCredito = total;
        }
    }
    
    // Guardar en variables globales para usar en el procesamiento
    window._infoCredito = infoCredito;
    window._esCreditoParcial = esCreditoParcial;
    window._montoPago = montoPago;
    window._montoCredito = montoCredito;
    
    // Mostrar montos en el modal
    document.getElementById('montoTransferencia').textContent = formatoMexicano(montoPago || total);
    document.getElementById('totalCredito').textContent = formatoMexicano(total);
    
    // Si hay crédito parcial, mostrar mensaje informativo en el modal
    if (esCreditoParcial && infoCredito) {
        const mensajeHTML = `
            <div style="background: #fef3c7; padding: 1rem; border-radius: 12px; margin-bottom: 1rem; border: 1px solid #fde68a;">
                <p style="margin: 0; font-weight: 600; color: #92400e;">
                    ${infoCredito.mensaje}
                </p>
                <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; color: #92400e;">
                    <strong>Monto a pagar (contado):</strong> ${formatoMexicano(montoPago)}
                    <br>
                    <strong>Monto a crédito:</strong> ${formatoMexicano(montoCredito)}
                </p>
            </div>
        `;
        document.getElementById('modalMensaje').innerHTML = mensajeHTML;
        document.getElementById('modalMensaje').style.display = 'block';
    }
    
    // Configurar opciones de pago según crédito habilitado
    const btnCredito = document.getElementById('btnCredito');
    if (btnCredito) {
        if (clienteCreditoHabilitado) {
            btnCredito.style.display = 'block';
            btnCredito.disabled = false;
            btnCredito.title = '';
        } else {
            btnCredito.style.display = 'block';
            btnCredito.disabled = true;
            btnCredito.title = 'El crédito no está habilitado para este cliente';
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
    
    if (document.getElementById('facturaNoCredito')) {
        document.getElementById('facturaNoCredito').classList.add('selected');
        document.getElementById('facturaSiCredito').classList.remove('selected');
    }
    if (document.getElementById('facturaRazonSocialContainerCredito')) {
        document.getElementById('facturaRazonSocialContainerCredito').style.display = 'none';
    }
    if (document.getElementById('facturaDatosPreviewCredito')) {
        document.getElementById('facturaDatosPreviewCredito').style.display = 'none';
    }
    datosFacturaSeleccionados = null;
    
    pagoSeleccionado = null;
    document.querySelectorAll('.opciones-pago button').forEach(b => b.classList.remove('selected'));
    
    // Si no hay crédito habilitado, seleccionar transferencia por defecto
    if (!clienteCreditoHabilitado) {
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
}

function seleccionarPago(tipo) {
    pagoSeleccionado = tipo;
    document.querySelectorAll('.opciones-pago button').forEach(b => b.classList.remove('selected'));
    
    if (tipo === 'transferencia') {
        document.getElementById('btnTransferencia').classList.add('selected');
        document.getElementById('formTransferencia').style.display = 'block';
        document.getElementById('formCredito').style.display = 'none';
    } else if (tipo === 'credito') {
        document.getElementById('btnCredito').classList.add('selected');
        document.getElementById('formCredito').style.display = 'block';
        document.getElementById('formTransferencia').style.display = 'none';
    }
}

// ⭐ FUNCIÓN PARA FACTURA EN CRÉDITO ⭐
function seleccionarFacturaCredito(opcion) {
    requiereFactura = (opcion === 'si');
    
    if (document.getElementById('facturaNoCredito')) {
        document.getElementById('facturaNoCredito').classList.remove('selected');
        document.getElementById('facturaSiCredito').classList.remove('selected');
    }
    
    if (opcion === 'no') {
        if (document.getElementById('facturaNoCredito')) {
            document.getElementById('facturaNoCredito').classList.add('selected');
        }
        if (document.getElementById('facturaRazonSocialContainerCredito')) {
            document.getElementById('facturaRazonSocialContainerCredito').style.display = 'none';
        }
        if (document.getElementById('facturaDatosPreviewCredito')) {
            document.getElementById('facturaDatosPreviewCredito').style.display = 'none';
        }
        datosFacturaSeleccionados = null;
    } else {
        if (document.getElementById('facturaSiCredito')) {
            document.getElementById('facturaSiCredito').classList.add('selected');
        }
        if (document.getElementById('facturaRazonSocialContainerCredito')) {
            document.getElementById('facturaRazonSocialContainerCredito').style.display = 'block';
        }
        actualizarSelectorFacturacionCredito();
    }
}

function actualizarSelectorFacturacionCredito() {
    const select = document.getElementById('facturaRazonSocialSelectCredito');
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

function cargarDatosFacturaSeleccionadosCredito() {
    const select = document.getElementById('facturaRazonSocialSelectCredito');
    const index = parseInt(select.value);
    
    if (isNaN(index) || index < 0 || index >= facturacionCliente.length) {
        if (document.getElementById('facturaDatosPreviewCredito')) {
            document.getElementById('facturaDatosPreviewCredito').style.display = 'none';
        }
        datosFacturaSeleccionados = null;
        return;
    }
    
    const fact = facturacionCliente[index];
    datosFacturaSeleccionados = fact;
    
    if (document.getElementById('facturaPreviewRFCCredito')) {
        document.getElementById('facturaPreviewRFCCredito').textContent = fact.rfc || '---';
    }
    if (document.getElementById('facturaPreviewUsoCredito')) {
        document.getElementById('facturaPreviewUsoCredito').textContent = fact.usoCFDI || '---';
    }
    if (document.getElementById('facturaPreviewCPCredito')) {
        document.getElementById('facturaPreviewCPCredito').textContent = fact.cp || '---';
    }
    if (document.getElementById('facturaPreviewRegimenCredito')) {
        document.getElementById('facturaPreviewRegimenCredito').textContent = fact.regimen || '---';
    }
    if (document.getElementById('facturaPreviewCorreoCredito')) {
        document.getElementById('facturaPreviewCorreoCredito').textContent = fact.correo || '---';
    }
    
    if (document.getElementById('facturaDatosPreviewCredito')) {
        document.getElementById('facturaDatosPreviewCredito').style.display = 'block';
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
    };
    reader.readAsDataURL(file);
}

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
// ⭐ FUNCIÓN PARA GENERAR PDF DEL COMPROBANTE ⭐
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

        const html = `
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

        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const ventana = window.open(url, '_blank');
        if (ventana) {
            ventana.focus();
            setTimeout(() => {
                ventana.print();
            }, 1000);
        } else {
            const link = document.createElement('a');
            link.href = url;
            link.download = `Comprobante_${datos.folio}.html`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
        
        console.log('✅ PDF del comprobante generado');
        return true;
    } catch (error) {
        console.error('❌ Error al generar PDF:', error);
        return false;
    }
}

// ============================================
// PROCESAMIENTO DE PAGOS - CON SOPORTE PARA CRÉDITO PARCIAL
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
    
    const btn = document.querySelector('#formTransferencia .btn-enviar');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Procesando...';
    
    try {
        const total = calcularTotal();
        const folio = generarFolio();
        const fecha = new Date();
        
        // Determinar si es crédito parcial
        const esCreditoParcial = window._esCreditoParcial || false;
        const infoCredito = window._infoCredito || null;
        
        let productosParaVenta = [];
        let montoPago = total;
        let montoCredito = 0;
        let tipoPago = 'Transferencia';
        let estadoPago = 'Validando pago';
        
        if (esCreditoParcial && infoCredito) {
            // Crédito parcial: parte se paga, parte va a crédito
            tipoPago = 'Crédito Parcial';
            montoPago = infoCredito.montoPago;
            montoCredito = infoCredito.montoCredito;
            estadoPago = 'Validando pago';
            
            // Productos que van a pago (contado)
            const productosPago = infoCredito.productosPago || [];
            productosPago.forEach(item => {
                productosParaVenta.push({
                    clave: item.clave,
                    nombre: item.nombre,
                    cantidad: item.cantidad,
                    precio: item.precio,
                    descuento: item.descuento,
                    importe: item.precio * item.cantidad * (1 - item.descuento / 100),
                    precioCompra: item.precioCompra || 0,
                    personalizado: item.personalizado || false,
                    _tipo: 'pago'
                });
            });
            
            // Productos que van a crédito
            const productosCredito = infoCredito.productosCredito || [];
            productosCredito.forEach(item => {
                productosParaVenta.push({
                    clave: item.clave,
                    nombre: item.nombre,
                    cantidad: item.cantidad,
                    precio: item.precio,
                    descuento: item.descuento,
                    importe: item.precio * item.cantidad * (1 - item.descuento / 100),
                    precioCompra: item.precioCompra || 0,
                    personalizado: item.personalizado || false,
                    _tipo: 'credito'
                });
            });
            
        } else if (clienteCreditoHabilitado && pagoSeleccionado === 'credito') {
            // Crédito total
            tipoPago = 'Crédito';
            montoPago = 0;
            montoCredito = total;
            estadoPago = 'En preparación';
            
            productosParaVenta = carrito.map(item => ({
                ...item,
                _tipo: 'credito'
            }));
            
        } else {
            // Pago de contado normal
            tipoPago = 'Transferencia';
            montoPago = total;
            montoCredito = 0;
            estadoPago = 'Validando pago';
            
            productosParaVenta = carrito.map(item => ({
                ...item,
                _tipo: 'pago'
            }));
        }
        
        const datosVenta = {
            folio: folio,
            fecha: fecha,
            cliente: clienteData,
            direccion: window.datosEnvio || null,
            productos: productosParaVenta,
            total: total,
            subtotal: total / 1.16,
            iva: total - (total / 1.16),
            tipoPago: tipoPago,
            referencia: referencia,
            comprobante: comprobanteBase64,
            comprobanteNombre: comprobanteNombre,
            comprobanteTipo: comprobanteTipo,
            sucursal: SUCURSAL_WEB,
            nombreDireccion: window.datosEnvio ? window.datosEnvio.nombreDireccion || 'Sin nombre' : 'Sin nombre',
            requiereFactura: requiereFactura,
            datosFactura: datosFacturaSeleccionados,
            // ⭐ CAMPOS PARA CRÉDITO PARCIAL
            montoPago: montoPago,
            montoCredito: montoCredito,
            estadoPago: estadoPago,
            esCreditoParcial: esCreditoParcial
        };
        
        await guardarVentaEnEstadisticas(datosVenta);
        await enviarCorreoVentaWeb(datosVenta);
        
        generarPDFComprobante(datosVenta);
        
        let mensajeExito = `
            ✅ ¡Compra realizada con éxito!<br>
            <strong>Folio:</strong> ${folio}<br>
            <strong>Total:</strong> ${formatoMexicano(total)}<br>
            <strong>Método:</strong> ${tipoPago}<br>
            <strong>Referencia:</strong> ${referencia}<br>
        `;
        
        if (esCreditoParcial) {
            mensajeExito += `
                <strong>Monto pagado (contado):</strong> ${formatoMexicano(montoPago)}<br>
                <strong>Monto a crédito:</strong> ${formatoMexicano(montoCredito)}<br>
                <strong>Días de crédito:</strong> ${DIAS_CREDITO_FIJO} días<br>
                <span style="color:#92400e;font-size:0.9rem;">⚠️ El saldo a crédito deberá ser liquidado en ${DIAS_CREDITO_FIJO} días.</span><br>
            `;
        }
        
        if (requiereFactura) {
            mensajeExito += `<strong>Factura:</strong> Sí - ${datosFacturaSeleccionados ? datosFacturaSeleccionados.razonSocial : 'N/A'}<br>`;
        } else {
            mensajeExito += `<strong>Factura:</strong> No<br>`;
        }
        
        mensajeExito += `<br>Se ha descargado el comprobante en formato PDF.<br>Se ha enviado un correo a ventas@proconstruccionmx.com con los detalles.`;
        
        mostrarMensajeModal('exito', mensajeExito);
        
        carrito = [];
        renderizarCarrito();
        window.datosEnvio = null;
        window._infoCredito = null;
        window._esCreditoParcial = false;
        window._montoPago = 0;
        window._montoCredito = 0;
        
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Confirmar Compra';
        
        setTimeout(() => {
            cerrarModalPago();
        }, 8000);
        
    } catch (error) {
        console.error('Error al procesar pago:', error);
        mostrarMensajeModal('error', '❌ Error al procesar el pago. Por favor, intenta de nuevo o contacta a tu asesor.');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Confirmar Compra';
    }
}

async function procesarPagoCredito() {
    const dias = DIAS_CREDITO_FIJO;
    const total = calcularTotal();
    
    if (!window.datosEnvio || !window.datosEnvio.mapsUrl || window.datosEnvio.mapsUrl === 'No proporcionado') {
        mostrarMensajeModal('error', '⚠️ La URL de Google Maps es obligatoria. Por favor, proporciona la ubicación exacta.');
        return;
    }
    
    if (requiereFactura && !datosFacturaSeleccionados) {
        mostrarMensajeModal('error', '⚠️ Por favor, selecciona una razón social para facturar.');
        return;
    }
    
    const btn = document.querySelector('#formCredito .btn-enviar');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Procesando...';
    
    try {
        const folio = generarFolio();
        const fecha = new Date();
        const fechaPago = new Date(fecha);
        fechaPago.setDate(fechaPago.getDate() + dias);
        
        // Verificar si es crédito parcial
        const esCreditoParcial = window._esCreditoParcial || false;
        const infoCredito = window._infoCredito || null;
        
        let productosParaVenta = [];
        let montoPago = 0;
        let montoCredito = total;
        let tipoPago = 'Crédito';
        let estadoPago = 'En preparación';
        
        if (esCreditoParcial && infoCredito) {
            tipoPago = 'Crédito Parcial';
            montoPago = infoCredito.montoPago;
            montoCredito = infoCredito.montoCredito;
            estadoPago = 'Validando pago';
            
            // Productos que van a pago (contado)
            const productosPago = infoCredito.productosPago || [];
            productosPago.forEach(item => {
                productosParaVenta.push({
                    clave: item.clave,
                    nombre: item.nombre,
                    cantidad: item.cantidad,
                    precio: item.precio,
                    descuento: item.descuento,
                    importe: item.precio * item.cantidad * (1 - item.descuento / 100),
                    precioCompra: item.precioCompra || 0,
                    personalizado: item.personalizado || false,
                    _tipo: 'pago'
                });
            });
            
            // Productos que van a crédito
            const productosCredito = infoCredito.productosCredito || [];
            productosCredito.forEach(item => {
                productosParaVenta.push({
                    clave: item.clave,
                    nombre: item.nombre,
                    cantidad: item.cantidad,
                    precio: item.precio,
                    descuento: item.descuento,
                    importe: item.precio * item.cantidad * (1 - item.descuento / 100),
                    precioCompra: item.precioCompra || 0,
                    personalizado: item.personalizado || false,
                    _tipo: 'credito'
                });
            });
            
        } else {
            // Crédito total
            productosParaVenta = carrito.map(item => ({
                ...item,
                _tipo: 'credito'
            }));
        }
        
        const datosVenta = {
            folio: folio,
            fecha: fecha,
            cliente: clienteData,
            direccion: window.datosEnvio || null,
            productos: productosParaVenta,
            total: total,
            subtotal: total / 1.16,
            iva: total - (total / 1.16),
            tipoPago: tipoPago,
            diasCredito: dias,
            anticipo: 0,
            saldoPendiente: montoCredito,
            fechaPago: fechaPago,
            sucursal: SUCURSAL_WEB,
            nombreDireccion: window.datosEnvio ? window.datosEnvio.nombreDireccion || 'Sin nombre' : 'Sin nombre',
            requiereFactura: requiereFactura,
            datosFactura: datosFacturaSeleccionados,
            // ⭐ CAMPOS PARA CRÉDITO PARCIAL
            montoPago: montoPago,
            montoCredito: montoCredito,
            estadoPago: estadoPago,
            esCreditoParcial: esCreditoParcial,
            referencia: 'CRÉDITO',
            comprobante: null,
            comprobanteNombre: null,
            comprobanteTipo: null
        };
        
        await guardarVentaEnEstadisticas(datosVenta);
        await enviarCorreoVentaWeb(datosVenta);
        
        generarPDFComprobante(datosVenta);
        
        let mensajeExito = `
            ✅ ¡Crédito ${esCreditoParcial ? 'parcial' : ''} aprobado!<br>
            <strong>Folio:</strong> ${folio}<br>
            <strong>Total:</strong> ${formatoMexicano(total)}<br>
            <strong>Días de crédito:</strong> ${dias} días fijos<br>
            <strong>Fecha de pago:</strong> ${fechaPago.toLocaleDateString('es-MX')}<br>
        `;
        
        if (esCreditoParcial) {
            mensajeExito += `
                <strong>Monto pagado (contado):</strong> ${formatoMexicano(montoPago)}<br>
                <strong>Monto a crédito:</strong> ${formatoMexicano(montoCredito)}<br>
                <span style="color:#92400e;font-size:0.9rem;">⚠️ El saldo a crédito deberá ser liquidado en ${dias} días.</span><br>
            `;
        }
        
        if (requiereFactura) {
            mensajeExito += `<strong>Factura:</strong> Sí - ${datosFacturaSeleccionados ? datosFacturaSeleccionados.razonSocial : 'N/A'}<br>`;
        } else {
            mensajeExito += `<strong>Factura:</strong> No<br>`;
        }
        
        mensajeExito += `<br>Se ha descargado el comprobante en formato PDF.<br>Se ha enviado un correo a ventas@proconstruccionmx.com con los detalles.`;
        
        if (esCreditoParcial) {
            mensajeExito += `<br><span style="color:#92400e;font-size:0.9rem;">⚠️ Realiza la transferencia del monto de contado para completar la compra.</span>`;
        }
        
        mostrarMensajeModal('exito', mensajeExito);
        
        carrito = [];
        renderizarCarrito();
        window.datosEnvio = null;
        window._infoCredito = null;
        window._esCreditoParcial = false;
        window._montoPago = 0;
        window._montoCredito = 0;
        
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check"></i> Confirmar Crédito';
        
        setTimeout(() => {
            cerrarModalPago();
        }, 8000);
        
    } catch (error) {
        console.error('Error al procesar crédito:', error);
        mostrarMensajeModal('error', '❌ Error al procesar el crédito. Por favor, intenta de nuevo o contacta a tu asesor.');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check"></i> Confirmar Crédito';
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
        
        const fechaFormateada = datos.fecha.toLocaleString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        // Procesar cada producto
        for (const producto of datos.productos) {
            let precioCompra = 0;
            let ganancia = 0;
            
            const productoCompleto = productosGlobales.find(p => p.clave === producto.clave);
            if (productoCompleto) {
                precioCompra = productoCompleto.precioCompra || 0;
                const costoTotal = precioCompra * producto.cantidad;
                ganancia = producto.importe - costoTotal;
            }
            
            // Determinar si este producto va a crédito o a pago
            let creditoPendiente = 0;
            let creditoLiquidado = 0;
            let montoPagado = 0;
            
            if (datos.tipoPago === 'Crédito' || datos.tipoPago === 'Crédito Parcial') {
                if (producto._tipo === 'credito') {
                    // Producto que va a crédito
                    if (datos.total > 0) {
                        const proporcion = producto.importe / datos.total;
                        creditoPendiente = (datos.montoCredito || datos.total) * proporcion;
                    } else {
                        creditoPendiente = producto.importe;
                    }
                    montoPagado = 0;
                } else if (producto._tipo === 'pago') {
                    // Producto que se paga de contado
                    creditoPendiente = 0;
                    montoPagado = producto.importe;
                } else {
                    // Por defecto, si no se especifica, va a crédito
                    creditoPendiente = producto.importe;
                    montoPagado = 0;
                }
            } else {
                // Pago de contado normal
                creditoPendiente = 0;
                creditoLiquidado = 0;
                montoPagado = producto.importe;
            }
            
            const filaProducto = [
                fechaFormateada,
                datos.folio,
                producto.nombre,
                producto.cantidad,
                producto.importe.toFixed(2),
                ganancia.toFixed(2),
                '', // Columna G: vacía
                creditoPendiente.toFixed(2), // Columna H: Crédito pendiente
                montoPagado.toFixed(2), // Columna I: Monto pagado
                datos.tipoPago === 'Crédito' || datos.tipoPago === 'Crédito Parcial' ? DIAS_CREDITO_FIJO : 0,
                datos.tipoPago === 'Crédito' || datos.tipoPago === 'Crédito Parcial' ? datos.fechaPago.toLocaleDateString('es-MX') : '',
                datos.sucursal
            ];
            
            await guardarFilaGoogleSheets(HOJA_EST_PRODUCTOS, filaProducto);
        }
        
        // Guardar en la hoja de clientes
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
        
        // Calcular crédito pendiente total y monto pagado total
        let creditoPendienteTotal = 0;
        let montoPagadoTotal = 0;
        
        for (const producto of datos.productos) {
            if (producto._tipo === 'credito') {
                if (datos.total > 0) {
                    const proporcion = producto.importe / datos.total;
                    creditoPendienteTotal += (datos.montoCredito || datos.total) * proporcion;
                } else {
                    creditoPendienteTotal += producto.importe;
                }
            } else if (producto._tipo === 'pago') {
                montoPagadoTotal += producto.importe;
            } else {
                // Si no tiene _tipo, asumir que todo es pago (transferencia normal)
                montoPagadoTotal += producto.importe;
            }
        }
        
        // Si es crédito total, todo el total va a crédito
        if (datos.tipoPago === 'Crédito') {
            creditoPendienteTotal = datos.total;
            montoPagadoTotal = 0;
        }
        
        // Si es transferencia normal, todo es pago
        if (datos.tipoPago === 'Transferencia') {
            creditoPendienteTotal = 0;
            montoPagadoTotal = datos.total;
        }
        
        const filaCliente = [
            fechaFormateada,
            datos.folio,
            datos.cliente.codigo,
            datos.cliente.nombre,
            datos.total.toFixed(2),
            creditoPendienteTotal.toFixed(2), // Columna F: Crédito pendiente
            montoPagadoTotal.toFixed(2), // Columna G: Monto pagado
            facturaTexto,
            datos.sucursal,
            formaPago,
            tipoPago,
            '', // Columna L: vacía
            estadoPago, // Columna M: Estado del pago
            nombreDireccion,
            razonSocialFactura
        ];
        
        await guardarFilaGoogleSheets(HOJA_EST_CLIENTES, filaCliente);
        
        console.log('✅ Venta guardada en estadísticas correctamente');
        
    } catch (error) {
        console.error('❌ Error al guardar en estadísticas:', error);
        throw error;
    }
}

// ============================================
// FUNCIÓN PARA ENVIAR CORREO A VENTAS
// ============================================

async function enviarCorreoVentaWeb(datos) {
    try {
        console.log('📧 Enviando correo a ventas@proconstruccionmx.com...');
        
        const emailDestino = EMAIL_VENTAS;
        const asunto = `🛒 NUEVA COMPRA WEB - ${datos.folio} - ${datos.cliente.nombre}`;
        
        let htmlProductos = '';
        datos.productos.forEach(p => {
            let tipoLabel = '';
            if (p._tipo === 'credito') {
                tipoLabel = '<span style="color:#92400e;font-weight:600;">(Crédito)</span>';
            } else if (p._tipo === 'pago') {
                tipoLabel = '<span style="color:#16a34a;font-weight:600;">(Pagado)</span>';
            }
            
            htmlProductos += `
                <tr>
                    <td style="padding:8px;border-bottom:1px solid #e0e0e0;text-align:center;">${p.cantidad}</td>
                    <td style="padding:8px;border-bottom:1px solid #e0e0e0;">${p.nombre} ${tipoLabel}</td>
                    <td style="padding:8px;border-bottom:1px solid #e0e0e0;text-align:right;">${formatoMexicano(p.precio)}</td>
                    <td style="padding:8px;border-bottom:1px solid #e0e0e0;text-align:center;">${p.descuento}%</td>
                    <td style="padding:8px;border-bottom:1px solid #e0e0e0;text-align:right;">${formatoMexicano(p.importe)}</td>
                </tr>
            `;
        });
        
        let htmlDireccion = '';
        if (datos.direccion) {
            htmlDireccion = `
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
                <h3 style="color:#0A2540;">📦 Dirección de Envío</h3>
                <p><strong>Nombre:</strong> ${datos.nombreDireccion || 'Sin nombre'}</p>
                <p><strong>Calle:</strong> ${datos.direccion.calle}</p>
                <p><strong>Colonia:</strong> ${datos.direccion.colonia}</p>
                <p><strong>Alcaldía:</strong> ${datos.direccion.alcaldia}</p>
                <p><strong>Estado:</strong> ${datos.direccion.estado}</p>
                <p><strong>CP:</strong> ${datos.direccion.cp}</p>
                <p><strong>Teléfono:</strong> ${datos.direccion.telefono}</p>
                <p><strong>Recibe:</strong> ${datos.direccion.nombreRecibe}</p>
                ${datos.direccion.mapsUrl ? `<p><strong>Google Maps:</strong> <a href="${datos.direccion.mapsUrl}" target="_blank">Ver mapa</a></p>` : ''}
            `;
        }
        
        let htmlFactura = '';
        if (datos.requiereFactura && datos.datosFactura) {
            htmlFactura = `
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
                <h3 style="color:#0A2540;">📄 Datos de Facturación</h3>
                <p><strong>Razón Social:</strong> ${datos.datosFactura.razonSocial}</p>
                <p><strong>RFC:</strong> ${datos.datosFactura.rfc}</p>
                <p><strong>Uso de CFDI:</strong> ${datos.datosFactura.usoCFDI}</p>
                <p><strong>C.P.:</strong> ${datos.datosFactura.cp}</p>
                <p><strong>Régimen Fiscal:</strong> ${datos.datosFactura.regimen}</p>
                <p><strong>Correo:</strong> ${datos.datosFactura.correo}</p>
            `;
        }
        
        let infoPago = '';
        if (datos.tipoPago === 'Transferencia') {
            infoPago = `
                <p><strong>Referencia:</strong> ${datos.referencia}</p>
                <p><strong>Comprobante:</strong> ${datos.comprobanteNombre}</p>
            `;
        } else if (datos.tipoPago === 'Crédito' || datos.tipoPago === 'Crédito Parcial') {
            infoPago = `
                <p><strong>Días de crédito:</strong> ${datos.diasCredito || DIAS_CREDITO_FIJO} días</p>
                <p><strong>Saldo pendiente:</strong> ${formatoMexicano(datos.montoCredito || datos.total)}</p>
                <p><strong>Fecha de pago:</strong> ${datos.fechaPago ? datos.fechaPago.toLocaleDateString('es-MX') : 'No definida'}</p>
                ${datos.esCreditoParcial ? `<p style="color:#92400e;font-weight:600;">⚠️ Crédito parcial - Monto pagado: ${formatoMexicano(datos.montoPago)}</p>` : ''}
                <p style="color:#92400e;font-weight:600;">⚠️ Si no se cumple con el pago, se podrá eliminar el crédito.</p>
            `;
        }
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"></head>
            <body style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;">
                <div style="background:#0A2540;padding:20px;text-align:center;border-radius:10px 10px 0 0;">
                    <h1 style="color:white;margin:0;">ProConstrucción <span style="color:#F5A623;">MX</span></h1>
                    <p style="color:#94a3b8;margin:5px 0 0 0;">🛒 Nueva compra desde el portal web</p>
                </div>
                <div style="background:white;padding:30px;border-radius:0 0 10px 10px;box-shadow:0 2px 10px rgba(0,0,0,0.05);">
                    <h2 style="color:#0A2540;">🧾 ${datos.folio}</h2>
                    <p><strong>Fecha:</strong> ${datos.fecha.toLocaleString('es-MX')}</p>
                    <p><strong>Método de pago:</strong> ${datos.tipoPago}</p>
                    <p><strong>Factura:</strong> ${datos.requiereFactura ? 'SÍ' : 'NO'}</p>
                    <p><strong>Estado:</strong> ${datos.estadoPago || 'Validando pago'}</p>
                    
                    ${datos.esCreditoParcial ? `
                        <div style="background:#fef3c7;padding:10px;border-radius:8px;margin:10px 0;border:1px solid #fde68a;">
                            <p style="margin:0;color:#92400e;font-weight:600;">⚠️ CRÉDITO PARCIAL</p>
                            <p style="margin:0;color:#92400e;">Monto pagado: ${formatoMexicano(datos.montoPago)} | Monto a crédito: ${formatoMexicano(datos.montoCredito)}</p>
                        </div>
                    ` : ''}
                    
                    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
                    
                    <h3 style="color:#0A2540;">👤 Datos del Cliente</h3>
                    <p><strong>Nombre:</strong> ${datos.cliente.nombre}</p>
                    <p><strong>Código:</strong> ${datos.cliente.codigo}</p>
                    <p><strong>Correo:</strong> ${datos.cliente.correo}</p>
                    <p><strong>Teléfono:</strong> ${datos.cliente.telefono || 'No especificado'}</p>
                    <p><strong>Giro:</strong> ${datos.cliente.giro || 'No especificado'}</p>
                    <p><strong>Descuento Base:</strong> ${datos.cliente.descuento}%</p>
                    
                    ${htmlDireccion}
                    ${htmlFactura}
                    
                    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
                    
                    <h3 style="color:#0A2540;">📦 Productos</h3>
                    <table style="width:100%;border-collapse:collapse;">
                        <thead>
                            <tr style="background:#f8f9fa;">
                                <th style="padding:10px;text-align:center;">Cant.</th>
                                <th style="padding:10px;text-align:left;">Producto</th>
                                <th style="padding:10px;text-align:right;">Precio</th>
                                <th style="padding:10px;text-align:center;">Dto.%</th>
                                <th style="padding:10px;text-align:right;">Importe</th>
                            </tr>
                        </thead>
                        <tbody>${htmlProductos}</tbody>
                    </table>
                    
                    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
                    
                    <div style="text-align:right;">
                        <p><strong>Subtotal sin descuento:</strong> ${formatoMexicano(datos.subtotal + (datos.subtotal * 0.16))}</p>
                        <p><strong>Descuento total:</strong> -${formatoMexicano(datos.subtotal + (datos.subtotal * 0.16) - datos.total)}</p>
                        <p><strong>Subtotal:</strong> ${formatoMexicano(datos.subtotal)}</p>
                        <p><strong>IVA (16%):</strong> ${formatoMexicano(datos.iva)}</p>
                        <p style="font-size:1.4rem;font-weight:700;color:#0A2540;"><strong>TOTAL:</strong> ${formatoMexicano(datos.total)}</p>
                        ${datos.esCreditoParcial ? `
                            <p style="color:#92400e;font-weight:600;">Monto pagado: ${formatoMexicano(datos.montoPago)}</p>
                            <p style="color:#92400e;font-weight:600;">Monto a crédito: ${formatoMexicano(datos.montoCredito)}</p>
                        ` : ''}
                    </div>
                    
                    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
                    
                    <h3 style="color:#0A2540;">💳 Información de Pago</h3>
                    ${infoPago}
                    
                    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
                    
                    <p style="text-align:center;color:#718096;font-size:0.8rem;">
                        Este es un correo automático generado por el sistema de ProConstrucción MX.<br>
                        © ${new Date().getFullYear()} ProConstrucción MX - Todos los derechos reservados
                    </p>
                </div>
            </body>
            </html>
        `;
        
        const templateParams = {
            to_email: emailDestino,
            from_name: datos.cliente.nombre,
            subject: asunto,
            message: html,
            folio: datos.folio,
            cliente: datos.cliente.nombre,
            codigo: datos.cliente.codigo,
            total: formatoMexicano(datos.total),
            referencia: datos.referencia || 'N/A',
            tipo_pago: datos.tipoPago,
            factura: datos.requiereFactura ? 'SÍ' : 'NO'
        };
        
        console.log('📧 TemplateParams enviados:', templateParams);
        
        if (typeof emailjs === 'undefined') {
            console.error('❌ emailjs no está definido.');
            return { success: false, error: 'emailjs no disponible' };
        }
        
        const response = await emailjs.send(
            'service_o2zvkzo',
            'template_usum2d8',
            templateParams,
            '_gOxtGSQmrhTdoRuX'
        );
        
        console.log('✅ Correo enviado a ventas:', response);
        return { success: true };
        
    } catch (error) {
        console.error('❌ Error al enviar correo:', error);
        return { success: false, error: error.toString() };
    }
}

// ============================================
// ⭐ FUNCIONES PARA "MIS COMPRAS" ⭐
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
            
            if (codigo === codigoCliente && idVenta) {
                idsVenta.push(idVenta);
                const fechaObj = parseFechaGoogleSheets(fecha);
                ventasMap.set(idVenta, {
                    idVenta: idVenta,
                    fecha: fecha,
                    fechaObj: fechaObj,
                    total: total,
                    estado: estado || 'Validando pago',
                    codigoCliente: codigo
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
            
            if (idsVenta.includes(idVenta) && nombreProducto) {
                if (!productosPorVenta.has(idVenta)) {
                    productosPorVenta.set(idVenta, []);
                }
                productosPorVenta.get(idVenta).push({
                    nombre: nombreProducto,
                    cantidad: cantidad,
                    importe: importe
                });
                
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
                totalConIva: subtotal * 1.16
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
        
        renderizarOrdenes();
        renderizarHistorialCompras();
        renderizarEstadisticasProductos();
        
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
