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

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyRT70rT0pgG6IX4vjjvX44DuPnQqF1evnkQ7Vdz4XVyaZj0j3v4Em36U5FwLBlaRRxtQ/exec';

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
                    fechaRegistro: String(values[11] || '').trim()
                };
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
// FUNCIONES DE PAGO
// ============================================

function abrirModalPago() {
    const modal = document.getElementById('modalPago');
    modal.classList.add('active');
    
    document.getElementById('modalMensaje').innerHTML = '';
    document.getElementById('modalMensaje').style.display = 'none';
    document.getElementById('formTransferencia').style.display = 'none';
    document.getElementById('formCredito').style.display = 'none';
    
    const total = calcularTotal();
    document.getElementById('montoTransferencia').textContent = formatoMexicano(total);
    document.getElementById('totalCredito').textContent = formatoMexicano(total);
    
    // ⭐ FACTURA EN CRÉDITO - INICIALIZAR ⭐
    requiereFactura = false;
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

        // 1. Formatear fecha
        const hoy = new Date();
        const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                       'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const fechaFormateada = `${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`;

        // 2. Formatear nombre del asesor
        let nombreAsesor = "Gabriel";
        if (clienteData && clienteData.asesor) {
            nombreAsesor = clienteData.asesor;
        }

        // 3. Determinar título del documento
        const tituloDocumento = 'Comprobante de Compra';
        const mensajeFooter = '¡Gracias por su preferencia!';
        const facturaFooter = datos.requiereFactura ? '<p><strong>✅ Factura solicitada</strong></p>' : '';

        // 4. Generar filas de la tabla de productos
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

        // 5. Información de crédito (si aplica)
        let infoCreditoHTML = '';
        if (datos.tipoPago === 'Crédito') {
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

        // 6. Información de factura (si aplica)
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

        // 7. Método de pago
        let metodoPagoHTML = `<p><strong>Método de pago:</strong> ${datos.tipoPago.toUpperCase()}</p>`;

        // 8. Logo en base64 (COMPLETO Y CORRECTO)
        const logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAACXBIWXMAAAsTAAALEwEAmpwYAAAG+ElEQVR4nO2dXWwUVRiGn3dmtrvQH6tABWkXBaEorVpWQSRR1khaU5AaIzYhNcaLrIqKgYSVYLixF4Z4sS7SX+hViWmD4h9KxYAYNGpC9MIYUAJIpECkUiVBS7G22+2P5zu72XbPObNnds7Oec+TnN125pn3nO/s2Zk5M98QYBAREREREU0wI6GekTkdFhYgAk6HtcfjvWcDz3A+ADnO1gcRcDqsrHfF5yLAzQCYK5OQgL50MptYdvzTo4XywrzBd+PP+Q3P/2cZIMcHAh4Jm4nv8s3fdg3eZ//bNRYePW8GkSMh9gyiAY4l7m3+ZmHnYLZQ9h/YT9jFeF8bRABmtb/8qL98N2nYt2/jI/r6+aY8lGdE8BUHvPvYEyliLYsO7hHx+Y8bG7TdK57r2gR6IsiVqSqrBdmNwMfLiyCsBHKmio0Ayzw7syE6AlmmeS8jUCC7EejdK65+HfAsMz2zIYghvZ59IugOflDuktmQ3QhU29PhtnsOzHokKgK9+wU7C8a+tcPZ6YdtAywL+gBdn0Dc80fAtkP79rQzmbPCvgGypgJkQzYQrNOmYe0EqNqgFzhBUiz+5GzpZKIrvbP/c7Z4Tqcdh7MT4D9Ll3du8+r0L7a/2q43iLX2nH+9Q7K5sKTpMEi2CbArXSg2TqVLvRn3H5BscQKhMQH+P/C7/vGrnH6TOf/wOwKMffs2Q2GfDMGWCTAs/rM2fflK19nzR7SF/bb5FcyuG//YHWTfAU7rJhNaIECpUi1NA9OBvSf+0Rb2G9bAN69Q/zzYtIeoCJAB2Tt+51dLmhYWEcfv3ygth0X+3HrqjLYIwc4Xc1tm3r+zY3CgMs+r/PrNlL7APO+8f2D7shOj7l3w1dLzlUu9mQ8eLPzLqcN0Oc+8/9v1+1JtPpLGVY9FkPm6U2fStw8f7xj8/sltF5M7xHJavw4Sx9YbGcVxla+6zxaKBa/9Kxt/7Rsd+v2mqAJQBfW6rMAG0AKjLuU9ul9M7T90Pbl74w9nC1Ounzb0nWn7d/cZvOOR9A2lnk1fX7/1ghd6bCz01N8z8Vid7/dk0+feKBGvXm+zQBDLl1FEBTwZRIDrP9R6B+7dvPr7u3OOQ1LqFhIx7NkAvO+x6Z96dHYiVn++5afR9nzKWLgI8CwzPZssWCTbF8Omd46+dH+ivkLcQmJbtVg5u1RwxJ1HxAXFzhfe5+3kYft4P9n+Yab1wX1iXQ4Lg1sprRIT3pmbHeWJcT2bLNhGwLDM9KyIF9P5xZ/ogCBNAlZIC4sZiL2r3i6OtcQ15BCR+wVs1wHCWit+jZAPhnjVvwqFZt+B2juXvdL+hGVto3UBrDn4tC32zGRskwDH2/ESd7mSf3tp++v7IMMIa33zs7s/so95cvR2abuyz/fcFpBp0BLXcD9BZIJM/dzPpK3Bpy/1yK1e+61TXsVnOvr6vsVztXQCi4YQNhAeq1nELc/+NNVtP6mT1W1C7ix6cdl7+SsJ3KcH7nl24PzM9CdzCnX/cP3Tl7cLhQGLBQjy3JgsR8AXHYgc8m/7X7tQ0bntXNsEArL1/J/7bQlkGSJw28MmkqOU/y9+U1VqfKp/G2NLbDgKpRrFc8RUCejoAsAurQciA9l9FPCg4x1bgBUgCgKYgLYdV4mJwJntwEJYIyLC3R+1MiLrSYFNIDc80a7B2fC14tqkSf0IgK01V3J9y2QtuBtzl1+';

        // 9. Generar HTML completo
        const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
    * { 
        margin: 0; 
        padding: 0; 
        box-sizing: border-box; 
    }
    
    body { 
        margin: 0; 
        padding: 0; 
        background: white; 
        font-family: Arial, sans-serif; 
    }
    
    .container { 
        width: 100%; 
        padding: 30px 40px; 
        background: white; 
    }
    
    .titulo-empresa { 
        text-align: center; 
        font-size: 20px; 
        font-weight: bold; 
        color: #000000; 
        margin-bottom: 2px; 
    }
    
    .rfc { 
        text-align: center; 
        font-size: 14px; 
        color: #000000; 
        margin-bottom: 15px; 
    }
    
    .header { 
        display: flex; 
        justify-content: space-between; 
        margin-bottom: 30px; 
        padding-bottom: 20px; 
        border-bottom: 2px solid #2a3990; 
    }
    
    .logo { 
        max-width: 150px; 
        height: auto;
    }
    
    .folio { 
        font-size: 18px; 
        font-weight: bold; 
        color: #2a3990; 
    }
    
    .datos-cliente { 
        margin-bottom: 20px; 
    }
    
    .datos-cliente h3 { 
        margin-bottom: 10px; 
        color: #2a3990; 
    }
    
    .datos-cliente p { 
        margin: 3px 0; 
    }
    
    .info-credito { 
        background: #fff3cd; 
        padding: 15px; 
        border-radius: 8px; 
        margin: 20px 0; 
        border: 1px solid #ffeaa7; 
    }
    
    .info-credito h3 { 
        color: #856404; 
        margin-top: 0; 
    }
    
    .info-factura { 
        background: #d4edda; 
        padding: 15px; 
        border-radius: 8px; 
        margin: 20px 0; 
        border: 1px solid #c3e6cb; 
    }
    
    .info-factura h3 { 
        color: #155724; 
        margin-top: 0; 
    }
    
    table { 
        width: 100%; 
        border-collapse: collapse; 
        margin: 25px 0; 
        font-size: 12px; 
    }
    
    th { 
        background: #2a3990; 
        color: white; 
        padding: 15px 8px; 
        text-align: left; 
    }
    
    td { 
        padding: 12px 8px; 
        border-bottom: 1px solid #e0e0e0; 
    }
    
    .precio-personalizado { 
        background-color: #e8f4fd; 
        font-size: 10px; 
        padding: 2px 5px; 
        border-radius: 3px; 
        margin-left: 5px; 
    }
    
    .totales { 
        margin-top: 30px; 
        text-align: right; 
    }
    
    .total-row { 
        font-weight: bold; 
        font-size: 16px; 
        color: #2a3990; 
    }
    
    .terminos { 
        margin-top: 30px; 
        padding: 15px; 
        background: #f8f9fa; 
        border-radius: 8px; 
        font-size: 10px; 
        color: #666; 
    }
    
    .terminos h4 { 
        margin: 0 0 8px 0; 
        color: #2a3990; 
        font-size: 11px; 
    }
    
    .terminos p { 
        margin: 3px 0; 
    }
    
    .datos-bancarios { 
        margin-top: 30px; 
        padding: 15px; 
        background: #f8f9fa; 
        border-radius: 8px; 
        font-size: 12px; 
        color: #333; 
    }
    
    .datos-bancarios h4 { 
        margin: 0 0 8px 0; 
        color: #2a3990; 
        font-size: 13px; 
    }
    
    .datos-bancarios p { 
        margin: 3px 0; 
    }
    
    .footer { 
        margin-top: 40px; 
        padding-top: 20px; 
        font-size: 11px; 
        color: #666; 
        text-align: center; 
        border-top: 1px solid #2a3990; 
    }
    
    .footer .pro { 
        color: #2a3990; 
    }
    
    .footer .mx { 
        color: #D4AF37; 
    }
    
    @page { 
        margin: 0; 
    }
</style>
</head>
<body>
<div class="container">
    
    <!-- ENCABEZADO DE LA EMPRESA -->
    <div class="titulo-empresa">PROCONSTRUCCIONMX SAS DE CV</div>
    <div class="rfc">RFC: PRO2605135X4</div>
    
    <!-- HEADER CON LOGO Y FOLIO -->
    <div class="header">
        <div>
            <img src="${logoBase64}" alt="ProConstrucciónMX" class="logo">
        </div>
        <div style="text-align: right;">
            <p class="folio">${datos.folio}</p>
            <p>${fechaFormateada}</p>
            <p>${tituloDocumento}</p>
        </div>
    </div>
    
    <!-- DATOS DEL CLIENTE -->
    <div class="datos-cliente">
        <h3>Datos del Cliente</h3>
        <p><strong>Nombre:</strong> ${datos.cliente.nombre}</p>
        <p><strong>Código:</strong> ${datos.cliente.codigo}</p>
        <p><strong>Asesor:</strong> ${nombreAsesor}</p>
        ${metodoPagoHTML}
    </div>
    
    <!-- INFORMACIÓN DE CRÉDITO -->
    ${infoCreditoHTML}
    
    <!-- INFORMACIÓN DE FACTURA -->
    ${infoFacturaHTML}
    
    <!-- TABLA DE PRODUCTOS -->
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
    
    <!-- TOTALES -->
    <div class="totales">
        <p><strong>Importe base:</strong> ${formatoMexicano(datos.subtotal + (datos.subtotal * 0.16))}</p>
        <p><strong>Descuento aplicado:</strong> -${formatoMexicano((datos.subtotal + (datos.subtotal * 0.16)) - datos.total)}</p>
        <p><strong>Subtotal:</strong> ${formatoMexicano(datos.subtotal)}</p>
        <p><strong>IVA (16%):</strong> ${formatoMexicano(datos.iva)}</p>
        <p class="total-row"><strong>Total a pagar:</strong> ${formatoMexicano(datos.total)}</p>
    </div>
    
    <!-- CONDICIONES COMERCIALES -->
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
    
    <!-- DATOS BANCARIOS -->
    <div class="datos-bancarios">
        <h4>Datos bancarios para depósitos</h4>
        <p><strong>PROCONSTRUCCIONMX SAS DE CV</strong></p>
        <p><strong>BANCO:</strong> BBVA</p>
        <p><strong>NÚMERO DE CUENTA:</strong> 0127744064</p>
        <p><strong>CUENTA CLABE:</strong> 012180001277440643</p>
    </div>
    
    <!-- FOOTER -->
    <div class="footer">
        <p><strong><span class="pro">ProConstrucción</span><span class="mx">MX</span></strong></p>
        <p>📧 ventas@proconstruccionmx.com</p>
        <p>${mensajeFooter}</p>
        ${facturaFooter}
    </div>
    
</div>
</body>
</html>`;

        // 10. Crear el PDF usando la ventana de impresión
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
// PROCESAMIENTO DE PAGOS
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
        
        const datosVenta = {
            folio: folio,
            fecha: fecha,
            cliente: clienteData,
            direccion: window.datosEnvio || null,
            productos: carrito.map(item => ({
                clave: item.clave,
                nombre: item.nombre,
                cantidad: item.cantidad,
                precio: item.precio,
                descuento: item.descuento,
                importe: item.importe,
                precioCompra: item.precioCompra,
                personalizado: item.personalizado || false
            })),
            total: total,
            subtotal: total / 1.16,
            iva: total - (total / 1.16),
            tipoPago: 'Transferencia',
            referencia: referencia,
            comprobante: comprobanteBase64,
            comprobanteNombre: comprobanteNombre,
            comprobanteTipo: comprobanteTipo,
            sucursal: SUCURSAL_WEB,
            nombreDireccion: window.datosEnvio ? window.datosEnvio.nombreDireccion || 'Sin nombre' : 'Sin nombre',
            requiereFactura: requiereFactura,
            datosFactura: datosFacturaSeleccionados
        };
        
        await guardarVentaEnEstadisticas(datosVenta);
        await enviarCorreoVentaWeb(datosVenta);
        
        generarPDFComprobante(datosVenta);
        
        mostrarMensajeModal('exito', `
            ✅ ¡Compra realizada con éxito!<br>
            <strong>Folio:</strong> ${folio}<br>
            <strong>Total:</strong> ${formatoMexicano(total)}<br>
            <strong>Método:</strong> Transferencia<br>
            <strong>Referencia:</strong> ${referencia}<br>
            ${requiereFactura ? `<strong>Factura:</strong> Sí - ${datosFacturaSeleccionados ? datosFacturaSeleccionados.razonSocial : 'N/A'}` : '<strong>Factura:</strong> No'}<br><br>
            Se ha descargado el comprobante en formato PDF.<br>
            Se ha enviado un correo a ventas@proconstruccionmx.com con los detalles y comprobante.
        `);
        
        carrito = [];
        renderizarCarrito();
        window.datosEnvio = null;
        
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
    
    // ⭐ VALIDAR FACTURA EN CRÉDITO ⭐
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
        
        const datosVenta = {
            folio: folio,
            fecha: fecha,
            cliente: clienteData,
            direccion: window.datosEnvio || null,
            productos: carrito.map(item => ({
                clave: item.clave,
                nombre: item.nombre,
                cantidad: item.cantidad,
                precio: item.precio,
                descuento: item.descuento,
                importe: item.importe,
                precioCompra: item.precioCompra,
                personalizado: item.personalizado || false
            })),
            total: total,
            subtotal: total / 1.16,
            iva: total - (total / 1.16),
            tipoPago: 'Crédito',
            diasCredito: dias,
            anticipo: 0,
            saldoPendiente: total,
            fechaPago: fechaPago,
            sucursal: SUCURSAL_WEB,
            nombreDireccion: window.datosEnvio ? window.datosEnvio.nombreDireccion || 'Sin nombre' : 'Sin nombre',
            requiereFactura: requiereFactura,
            datosFactura: datosFacturaSeleccionados
        };
        
        await guardarVentaEnEstadisticas(datosVenta);
        await enviarCorreoVentaWeb(datosVenta);
        
        generarPDFComprobante(datosVenta);
        
        mostrarMensajeModal('exito', `
            ✅ ¡Crédito aprobado!<br>
            <strong>Folio:</strong> ${folio}<br>
            <strong>Total:</strong> ${formatoMexicano(total)}<br>
            <strong>Días de crédito:</strong> ${dias} días fijos<br>
            <strong>Fecha de pago:</strong> ${fechaPago.toLocaleDateString('es-MX')}<br>
            ${requiereFactura ? `<strong>Factura:</strong> Sí - ${datosFacturaSeleccionados ? datosFacturaSeleccionados.razonSocial : 'N/A'}` : '<strong>Factura:</strong> No'}<br><br>
            Se ha descargado el comprobante en formato PDF.<br>
            Se ha enviado un correo a ventas@proconstruccionmx.com con los detalles.<br>
            <span style="color:#92400e;font-size:0.9rem;">⚠️ Si no se cumple con el pago en la fecha establecida, se podrá eliminar el crédito.</span>
        `);
        
        carrito = [];
        renderizarCarrito();
        window.datosEnvio = null;
        
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
            let creditoLiquidado = 0;
            if (datos.tipoPago === 'Crédito' && datos.total > 0) {
                const proporcion = producto.importe / datos.total;
                creditoPendiente = datos.saldoPendiente * proporcion;
                creditoLiquidado = 0;
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
                creditoLiquidado.toFixed(2),
                datos.tipoPago === 'Crédito' ? datos.diasCredito : 0,
                datos.tipoPago === 'Crédito' ? datos.fechaPago.toLocaleDateString('es-MX') : '',
                datos.sucursal
            ];
            
            await guardarFilaGoogleSheets(HOJA_EST_PRODUCTOS, filaProducto);
        }
        
        const facturaTexto = datos.requiereFactura ? 'SÍ' : 'NO';
        const formaPago = datos.tipoPago === 'Transferencia' ? 'Transferencia bancaria' : datos.tipoPago.toUpperCase();
        const tipoPago = datos.tipoPago === 'Crédito' ? 'Pago diferido en parcialidades' : 'Pago en una sola exhibición';
        // ⭐ CORREGIDO: Para crédito, estado "En preparación" en lugar de "Pendiente" ⭐
        const estadoPago = datos.tipoPago === 'Crédito' ? 'En preparación' : 'Validando';
        const nombreDireccion = datos.nombreDireccion || 'Sin nombre';
        
        // ⭐ OBTENER LA RAZÓN SOCIAL SELECCIONADA PARA FACTURA ⭐
        let razonSocialFactura = '';
        if (datos.requiereFactura && datos.datosFactura) {
            razonSocialFactura = datos.datosFactura.razonSocial || '';
        }
        
        const filaCliente = [
            fechaFormateada,
            datos.folio,
            datos.cliente.codigo,
            datos.cliente.nombre,
            datos.total.toFixed(2),
            datos.tipoPago === 'Crédito' ? datos.saldoPendiente.toFixed(2) : '0.00',
            '0.00',
            facturaTexto,
            datos.sucursal,
            formaPago,
            tipoPago,
            '',
            estadoPago,
            nombreDireccion,
            razonSocialFactura  // ⭐ COLUMNA O - RAZÓN SOCIAL DE FACTURA ⭐
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
            htmlProductos += `
                <tr>
                    <td style="padding:8px;border-bottom:1px solid #e0e0e0;text-align:center;">${p.cantidad}</td>
                    <td style="padding:8px;border-bottom:1px solid #e0e0e0;">${p.nombre}</td>
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
        } else if (datos.tipoPago === 'Crédito') {
            infoPago = `
                <p><strong>Días de crédito:</strong> ${datos.diasCredito} días</p>
                <p><strong>Saldo pendiente:</strong> ${formatoMexicano(datos.saldoPendiente)}</p>
                <p><strong>Fecha de pago:</strong> ${datos.fechaPago.toLocaleDateString('es-MX')}</p>
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
        });
    });
}
