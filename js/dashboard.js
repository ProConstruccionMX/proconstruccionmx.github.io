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

const ID_ARCHIVO_PRECIOS_ESPECIALES = '10t2A9M5f1Bj7lyTTa_PhVGRv0wAK_4ePpk_1eURZQ5I';
const HOJA_PRECIOS_ESPECIALES = 'Hoja 1';

const WORKER_URL = 'https://proconstruccionmx-proxy.proconstruccionmx.workers.dev';

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
let requiereFactura = false;
let datosFacturaSeleccionados = null;

let historialVentas = [];
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

// ============================================
// PARSE FECHAS
// ============================================

function parseFechaGoogleSheets(fechaStr) {
    if (!fechaStr) return null;
    
    if (typeof fechaStr === 'object' && fechaStr !== null) {
        if (typeof fechaStr.getTime === 'function') {
            try {
                const time = fechaStr.getTime();
                if (!isNaN(time)) {
                    const fecha = new Date(time);
                    if (!isNaN(fecha.getTime())) return fecha;
                }
            } catch (e) {}
        }
        if (fechaStr instanceof Date && !isNaN(fechaStr.getTime())) return fechaStr;
    }
    
    if (typeof fechaStr === 'number') {
        const fecha = new Date(fechaStr);
        if (!isNaN(fecha.getTime())) return fecha;
        return null;
    }
    
    const fechaString = String(fechaStr).trim();
    if (!fechaString) return null;
    
    const regex = /^(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2}):(\d{2})$/;
    const match = fechaString.match(regex);
    if (match) {
        const fecha = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]), parseInt(match[4]), parseInt(match[5]), parseInt(match[6]));
        if (!isNaN(fecha.getTime())) return fecha;
    }
    
    const regexFecha = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const matchFecha = fechaString.match(regexFecha);
    if (matchFecha) {
        const fecha = new Date(parseInt(matchFecha[3]), parseInt(matchFecha[2]) - 1, parseInt(matchFecha[1]));
        if (!isNaN(fecha.getTime())) return fecha;
    }
    
    const fecha = new Date(fechaString);
    if (!isNaN(fecha.getTime())) return fecha;
    
    return null;
}

function formatearFecha(fechaStr) {
    const fecha = parseFechaGoogleSheets(fechaStr);
    if (!fecha) return 'Fecha no disponible';
    return fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

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
    const numero = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
    return `CT-${dd}${mm}${yyyy}-${numero}`;
}

function mostrarNotificacion(mensaje) {
    const div = document.createElement('div');
    div.style.cssText = `
        position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
        background: #0A2540; color: white; padding: 1rem 2rem; border-radius: 12px;
        font-weight: 600; z-index: 2000; box-shadow: 0 8px 30px rgba(0,0,0,0.2);
        animation: fadeInUp 0.3s ease-out; max-width: 90%; text-align: center;
    `;
    div.textContent = mensaje;
    document.body.appendChild(div);
    setTimeout(() => {
        div.style.opacity = '0';
        div.style.transition = 'opacity 0.3s ease';
        setTimeout(() => div.remove(), 300);
    }, 3000);
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
    const codigo = sessionStorage.getItem('codigoCliente');
    console.log('📧 Email:', email, '| Código:', codigo);
    
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
// WORKER - COMUNICACIÓN
// ============================================

async function guardarFilaGoogleSheets(sheetName, datos) {
    try {
        console.log('📝 guardarFila:', sheetName, datos);
        const response = await fetch(`${WORKER_URL}/ventas`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'guardarFila', sheetName, datos })
        });
        const result = await response.json();
        console.log('✅ Respuesta Worker:', result);
        return result;
    } catch (error) {
        console.error('❌ Error:', error);
        return { success: false, error: error.toString() };
    }
}

async function agregarDireccionEnSheets(direccion) {
    try {
        const response = await fetch(`${WORKER_URL}/direcciones`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
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
        return await response.json();
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

async function actualizarDireccionEnSheets(fila, datos) {
    try {
        const response = await fetch(`${WORKER_URL}/direcciones`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                action: 'actualizar',
                fila: fila,
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
            })
        });
        return await response.json();
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

async function eliminarDireccionEnSheets(fila) {
    try {
        const response = await fetch(`${WORKER_URL}/direcciones`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'eliminar', fila: fila })
        });
        return await response.json();
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}
// ============================================
// CARGA DE DATOS
// ============================================

async function cargarDatosCliente(email) {
    try {
        const url = `${WORKER_URL}/leer?sheetId=${ID_BASE_CLIENTES}&sheetName=${HOJA_BASE_CLIENTES}`;
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
                
                console.log('💳 Crédito:', clienteCreditoHabilitado, '| Peso:', clienteLimiteCreditoPeso, '| Monto:', clienteLimiteCreditoMonto);
                break;
            }
        }
        
        if (clienteData) actualizarInfoCliente();
    } catch (error) {
        console.error('❌ Error cargando cliente:', error);
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
        const url = `${WORKER_URL}/leer?sheetId=${ID_PRODUCTOS}&sheetName=${HOJA_PRODUCTOS}`;
        const response = await fetch(url);
        const text = await response.text();
        const jsonStr = text.substring(text.indexOf('(') + 1, text.lastIndexOf(')'));
        const data = JSON.parse(jsonStr);
        const rows = data.table.rows;
        
        productosGlobales = [];
        
        for (let i = 0; i < rows.length; i++) {
            const values = rows[i].c.map(cell => cell ? cell.v : '');
            const clave = String(values[0] || '').trim();
            const nombre = String(values[1] || '').trim();
            
            if (!clave || !nombre || 
                clave.toLowerCase() === 'clave' || 
                clave.toLowerCase() === 'id' || 
                isNaN(parseFloat(clave))) continue;
            
            productosGlobales.push({
                clave: clave,
                nombre: nombre,
                descripcion: String(values[2] || '').trim(),
                precio: parseFloat(values[3]) || 0,
                na: String(values[4] || '').trim(),
                precioCompra: parseFloat(values[5]) || 0,
                descuentoPublico: parseFloat(values[9]) || 0,
                descuentoTrabajador: parseFloat(values[10]) || 0,
                descuentoArquitecto: parseFloat(values[11]) || 0,
                descuentoConstructora: parseFloat(values[12]) || 0,
                descuentoDistribuidor: parseFloat(values[13]) || 0,
                pxv: String(values[14] || '').trim(),
                descuentoVolumenP: parseFloat(values[15]) || 0,
                descuentoVolumenQ: parseFloat(values[16]) || 0,
                pesoCondicion: String(values[17] || '').trim().toUpperCase() === 'SI' ? 'SI' : 'NO',
                peso: parseFloat(values[18]) || 0,
                requiereMinPiezas: String(values[19] || '').trim().toUpperCase() === 'SI',
                minPiezas: parseFloat(values[20]) || 0,
                permitido: String(values[21] || '').trim().toUpperCase() === 'SI'
            });
        }
        
        console.log(`📦 Productos cargados: ${productosGlobales.length}`);
    } catch (error) {
        console.error('❌ Error cargando productos:', error);
    }
}

async function cargarPreciosEspeciales() {
    try {
        const url = `${WORKER_URL}/leer?sheetId=${ID_ARCHIVO_PRECIOS_ESPECIALES}&sheetName=${HOJA_PRECIOS_ESPECIALES}`;
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
                    codigoCliente: String(values[1] || '').trim(),
                    claveProducto: String(values[3] || '').trim(),
                    precioPersonalizado: parseFloat(values[5]) || 0
                });
            }
        }
        console.log(`💰 Precios especiales: ${preciosEspecialesGlobales.length}`);
    } catch (error) {
        console.error('❌ Error cargando precios especiales:', error);
    }
}

async function cargarDireccionesCliente() {
    try {
        const codigoCliente = sessionStorage.getItem('codigoCliente');
        if (!codigoCliente) return;
        
        const url = `${WORKER_URL}/leer?sheetId=${ID_BASE_CLIENTES}&sheetName=${HOJA_DIRECCIONES}`;
        const response = await fetch(url);
        const text = await response.text();
        const jsonStr = text.substring(text.indexOf('(') + 1, text.lastIndexOf(')'));
        const data = JSON.parse(jsonStr);
        const rows = data.table.rows;
        
        direccionesCliente = [];
        
        for (let i = 0; i < rows.length; i++) {
            const values = rows[i].c.map(cell => cell ? cell.v : '');
            const codigo = String(values[0] || '').trim();
            const filaReal = i + 2;
            
            if (codigo === codigoCliente) {
                direccionesCliente.push({
                    fila: filaReal,
                    codigo: codigo,
                    nombre: String(values[1] || '').trim() || 'Sin nombre',
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
        
        console.log(`📦 Direcciones: ${direccionesCliente.length}`);
        renderizarDirecciones();
        actualizarSelectorDirecciones();
    } catch (error) {
        console.error('❌ Error cargando direcciones:', error);
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
            <div class="direccion-card">
                <div class="direccion-header">
                    <h4><i class="fas fa-home"></i> ${dir.nombre} <span style="font-size:0.7rem;color:var(--text-gray);">(Fila ${dir.fila})</span></h4>
                    <div class="direccion-actions">
                        <button class="btn-editar" onclick="editarDireccion(${index})"><i class="fas fa-edit"></i></button>
                        <button class="btn-eliminar" onclick="eliminarDireccion(${index})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="direccion-body">
                    <p><strong>Calle:</strong> ${dir.calle || '---'}</p>
                    <p><strong>Colonia:</strong> ${dir.colonia || '---'}</p>
                    <p><strong>Alcaldía:</strong> ${dir.alcaldia || '---'}</p>
                    <p><strong>Estado:</strong> ${dir.estado || '---'}</p>
                    <p><strong>CP:</strong> ${dir.cp || '---'}</p>
                    ${dir.mapsUrl ? `<p><strong>Maps:</strong> <a href="${dir.mapsUrl}" target="_blank">Ver mapa</a></p>` : ''}
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
        option.textContent = dir.nombre;
        select.appendChild(option);
    });
    select.value = '';
}

function editarDireccion(index) {
    const dir = direccionesCliente[index];
    if (!dir) return;
    document.getElementById('editDirIndex').value = index;
    document.getElementById('editDirFila').value = dir.fila;
    document.getElementById('editDirNombre').value = dir.nombre;
    document.getElementById('editDirCalle').value = dir.calle;
    document.getElementById('editDirColonia').value = dir.colonia;
    document.getElementById('editDirAlcaldia').value = dir.alcaldia;
    document.getElementById('editDirEstado').value = dir.estado;
    document.getElementById('editDirCP').value = dir.cp;
    document.getElementById('editDirMaps').value = dir.mapsUrl;
    document.getElementById('editDirTelefono').value = dir.telefono;
    document.getElementById('editDirNombreRecibe').value = dir.nombreRecibe;
    document.getElementById('modalEditarDireccion').classList.add('active');
}

function cerrarModalEditarDireccion() {
    document.getElementById('modalEditarDireccion').classList.remove('active');
}

async function guardarEdicionDireccion() {
    const index = parseInt(document.getElementById('editDirIndex').value);
    const dir = direccionesCliente[index];
    if (!dir) return;
    
    const fila = parseInt(document.getElementById('editDirFila').value);
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
    
    await actualizarDireccionEnSheets(fila, datosActualizados);
    direccionesCliente[index] = { ...dir, ...datosActualizados, fila: fila };
    renderizarDirecciones();
    actualizarSelectorDirecciones();
    cerrarModalEditarDireccion();
    mostrarNotificacion('✅ Dirección actualizada');
    setTimeout(() => cargarDireccionesCliente(), 1500);
}

async function eliminarDireccion(index) {
    const dir = direccionesCliente[index];
    if (!dir) return;
    if (!confirm(`¿Eliminar "${dir.nombre}"?`)) return;
    await eliminarDireccionEnSheets(dir.fila);
    direccionesCliente.splice(index, 1);
    renderizarDirecciones();
    actualizarSelectorDirecciones();
    mostrarNotificacion('🗑️ Dirección eliminada');
    setTimeout(() => cargarDireccionesCliente(), 1500);
}

async function guardarNuevaDireccion(datos) {
    const codigoCliente = sessionStorage.getItem('codigoCliente');
    if (!codigoCliente) return false;
    
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
    mostrarNotificacion('✅ Dirección guardada');
    await cargarDireccionesCliente();
    return true;
}

// ============================================
// FACTURACIÓN
// ============================================

async function cargarFacturacionCliente() {
    try {
        const codigoCliente = sessionStorage.getItem('codigoCliente');
        if (!codigoCliente) return;
        
        const response = await fetch(`${WORKER_URL}/facturacion`);
        const text = await response.text();
        const data = JSON.parse(text);
        
        if (!data.success || !data.data) {
            facturacionCliente = [];
            renderizarFacturacion();
            return;
        }
        
        facturacionCliente = [];
        for (let idx = 0; idx < data.data.length; idx++) {
            const row = data.data[idx];
            const codigo = String(row.ID || row.id || '').trim();
            if (codigo === codigoCliente) {
                facturacionCliente.push({
                    fila: idx + 2,
                    codigo: codigo,
                    nombre: String(row.Nombre || row.nombre || '').trim(),
                    razonSocial: String(row['Razón Social'] || row['Razon Social'] || row['RazónSocial'] || row['razonSocial'] || '').trim(),
                    rfc: String(row.RFC || row.rfc || '').trim(),
                    usoCFDI: String(row['Uso de CFDI'] || row['Uso CFDI'] || row['UsoCFDI'] || row['usoCFDI'] || '').trim(),
                    cp: String(row['C.P.'] || row['CP'] || row['C.P'] || row['cp'] || '').trim(),
                    regimen: String(row['Régimen Fiscal'] || row['Regimen Fiscal'] || row['RegimenFiscal'] || row['regimen'] || '').trim(),
                    correo: String(row.Correo || row.correo || '').trim()
                });
            }
        }
        
        console.log(`📦 Facturación: ${facturacionCliente.length}`);
        renderizarFacturacion();
        actualizarSelectorFacturacion();
    } catch (error) {
        console.error('❌ Error cargando facturación:', error);
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
            <div class="facturacion-card">
                <div class="facturacion-header">
                    <h4><i class="fas fa-file-invoice"></i> ${fact.nombre || 'Sin nombre'}</h4>
                    <div class="facturacion-actions">
                        <button class="btn-editar" onclick="editarFacturacion(${index})"><i class="fas fa-edit"></i> Editar</button>
                        <button class="btn-eliminar" onclick="eliminarFacturacion(${index})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="facturacion-body">
                    <p><strong>Razón Social:</strong> ${fact.razonSocial || '---'}</p>
                    <p><strong>RFC:</strong> ${fact.rfc || '---'}</p>
                    <p><strong>Uso CFDI:</strong> ${fact.usoCFDI || '---'}</p>
                    <p><strong>CP:</strong> ${fact.cp || '---'}</p>
                    <p><strong>Régimen:</strong> ${fact.regimen || '---'}</p>
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
        option.textContent = fact.razonSocial || fact.nombre;
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

function editarFacturacion(index) {
    const fact = facturacionCliente[index];
    if (!fact) return;
    document.getElementById('editFactIndex').value = index;
    document.getElementById('editFactFila').value = fact.fila;
    document.getElementById('editFactRazonSocial').value = fact.razonSocial;
    document.getElementById('editFactRFC').value = fact.rfc;
    document.getElementById('editFactUsoCFDI').value = fact.usoCFDI;
    document.getElementById('editFactCP').value = fact.cp;
    document.getElementById('editFactRegimen').value = fact.regimen;
    document.getElementById('editFactCorreo').value = fact.correo;
    document.getElementById('modalEditarFacturacion').classList.add('active');
}

function cerrarModalEditarFacturacion() {
    document.getElementById('modalEditarFacturacion').classList.remove('active');
}

async function guardarEdicionFacturacion() {
    const index = parseInt(document.getElementById('editFactIndex').value);
    const fact = facturacionCliente[index];
    if (!fact) return;
    
    const fila = parseInt(document.getElementById('editFactFila').value);
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
    
    const response = await fetch(`${WORKER_URL}/facturacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
            action: 'actualizarFacturacion',
            fila: fila,
            ...datosActualizados
        })
    });
    
    facturacionCliente[index] = { ...fact, ...datosActualizados, fila: fila };
    renderizarFacturacion();
    actualizarSelectorFacturacion();
    cerrarModalEditarFacturacion();
    mostrarNotificacion('✅ Facturación actualizada');
    setTimeout(() => cargarFacturacionCliente(), 1500);
}

async function eliminarFacturacion(index) {
    const fact = facturacionCliente[index];
    if (!fact) return;
    if (!confirm(`¿Eliminar facturación de "${fact.nombre}"?`)) return;
    
    await fetch(`${WORKER_URL}/facturacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'eliminarFacturacion', fila: fact.fila })
    });
    
    facturacionCliente.splice(index, 1);
    renderizarFacturacion();
    actualizarSelectorFacturacion();
    mostrarNotificacion('🗑️ Facturación eliminada');
    setTimeout(() => cargarFacturacionCliente(), 1500);
}

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
    if (!codigoCliente) return;
    
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
    
    await fetch(`${WORKER_URL}/facturacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'agregarFacturacion', ...datos })
    });
    
    cerrarModalAgregarFacturacion();
    mostrarNotificacion('✅ Facturación agregada');
    setTimeout(() => cargarFacturacionCliente(), 1500);
}

function mostrarMensajeModalAgregar(tipo, mensaje) {
    const div = document.getElementById('modalAgregarFactMensaje');
    div.className = tipo === 'exito' ? 'mensaje-exito' : 'mensaje-error';
    div.innerHTML = mensaje;
    div.style.display = 'block';
}

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
    if (!codigoCliente) return;
    
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
    
    await fetch(`${WORKER_URL}/facturacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'agregarFacturacion', ...datos })
    });
    
    cerrarModalAgregarFacturacionPago();
    mostrarNotificacion('✅ Facturación agregada');
    setTimeout(() => {
        cargarFacturacionCliente();
        setTimeout(() => actualizarSelectorFacturacion(), 500);
    }, 1500);
}

function mostrarMensajeModalAgregarPago(tipo, mensaje) {
    const div = document.getElementById('modalAgregarFactPagoMensaje');
    div.className = tipo === 'exito' ? 'mensaje-exito' : 'mensaje-error';
    div.innerHTML = mensaje;
    div.style.display = 'block';
}
// ============================================
// BÚSQUEDA DE PRODUCTOS
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
                if (producto.descuentoVolumenP > 0) partes.push(`+${producto.descuentoVolumenP}% (3T)`);
                if (producto.descuentoVolumenQ > 0) partes.push(`+${producto.descuentoVolumenQ}% (5T)`);
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
                <p class="precio">${formatoMexicano(precioFinal.precio)}</p>
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

function obtenerPrecioFinal(producto) {
    const precioEspecial = preciosEspecialesGlobales.find(p => 
        p.codigoCliente === clienteData.codigo && 
        p.claveProducto === producto.clave
    );
    if (precioEspecial) {
        return { precio: precioEspecial.precioPersonalizado, personalizado: true };
    }
    return { precio: producto.precio, personalizado: false };
}

function calcularDescuentoProducto(producto, cantidad) {
    const precioEspecial = preciosEspecialesGlobales.find(p => 
        p.codigoCliente === clienteData.codigo && p.claveProducto === producto.clave
    );
    if (precioEspecial) return 0;
    if (producto.na === 'N/A') return 0;
    
    const naNumero = parseFloat(producto.na);
    if (!isNaN(naNumero) && producto.na !== '' && producto.na !== '-' && producto.na !== 'N/A') {
        return naNumero;
    }
    
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
        if (descuentoAdicional > 0) return descuentoBase + descuentoAdicional;
    }
    return descuentoBase;
}

// ============================================
// CARRITO
// ============================================

function agregarAlCarrito(clave) {
    const producto = productosGlobales.find(p => p.clave === clave);
    if (!producto || !producto.permitido) {
        mostrarNotificacion('❌ Producto no disponible');
        return;
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
    mostrarNotificacion('✅ Producto agregado');
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

function verificarMinimoPiezas() {
    const productosConMinimo = carrito.filter(item => item.requiereMinPiezas && item.minPiezas > 0);
    if (productosConMinimo.length === 0) return { cumple: true, detalle: [] };
    
    let cumple = true;
    const detalle = [];
    productosConMinimo.forEach(item => {
        const ok = item.cantidad >= item.minPiezas;
        if (!ok) cumple = false;
        detalle.push({ nombre: item.nombre, minimo: item.minPiezas, actual: item.cantidad });
    });
    return { cumple, detalle };
}

function verificarPesoMinimo() {
    const productosConPeso = carrito.filter(item => {
        const producto = productosGlobales.find(p => p.clave === item.clave);
        return producto && producto.pesoCondicion === 'SI' && producto.peso > 0;
    });
    
    if (productosConPeso.length === 0) {
        return { cumple: true, pesoTotal: 0, productosConPeso: 0, productosAfectados: [] };
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
    
    return {
        cumple: pesoTotal >= PESO_MINIMO_TONELADA,
        pesoTotal: pesoTotal,
        productosConPeso: productosConPeso.length,
        productosAfectados: productosAfectados
    };
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
        return;
    }
    
    const verificarPeso = verificarPesoMinimo();
    const verificarMinPiezas = verificarMinimoPiezas();
    
    let html = `<table class="cart-table"><thead><tr>
        <th>Producto</th><th>Precio</th><th>Cantidad</th><th>Descuento</th><th>Importe</th><th></th>
    </tr></thead><tbody>`;
    
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
        if (item.pesoCondicion === 'SI' && item.peso > 0) {
            const pesoTotalItem = item.peso * item.cantidad;
            pesoInfo = `<br><small style="color:var(--text-gray);">⚖️ ${item.peso} kg/unidad → ${pesoTotalItem.toFixed(2)} kg total</small>`;
        }
        
        let minPiezasInfo = '';
        if (item.requiereMinPiezas && item.minPiezas > 0) {
            const cumple = item.cantidad >= item.minPiezas;
            const icono = cumple ? '✅' : '⚠️';
            const color = cumple ? '#16a34a' : '#92400e';
            minPiezasInfo = `<br><small style="color:${color};font-weight:600;">${icono} Mínimo: ${item.minPiezas} piezas</small>`;
        }
        
        html += `
            <tr>
                <td><strong>${item.nombre}</strong>${pesoInfo}${minPiezasInfo}<br><small style="color:var(--text-gray);">${item.clave}</small></td>
                <td>${formatoMexicano(item.precio)}</td>
                <td><input type="number" class="cantidad-input" value="${item.cantidad}" min="1" onchange="cambiarCantidad('${item.clave}', parseInt(this.value))"></td>
                <td>${item.descuento}%</td>
                <td>${formatoMexicano(importeFinal)}</td>
                <td><button class="btn-eliminar" onclick="eliminarDelCarrito('${item.clave}')"><i class="fas fa-trash"></i></button></td>
            </tr>
        `;
    });
    
    const iva = subtotal * 0.16;
    const total = subtotal + iva;
    html += `</tbody></table>`;
    
    if (!verificarMinPiezas.cumple) {
        html += `<div style="margin-top:1.5rem; padding:1.5rem; border-radius:12px; background:#fef3c7; border:2px solid #fde68a;">
            <p style="margin:0; font-weight:600; color:#92400e;">⚠️ Debes completar el mínimo de piezas.</p>
            ${verificarMinPiezas.detalle.map(d => `<div style="font-size:0.9rem; color:#92400e;">${d.nombre}: ${d.actual}/${d.minimo}</div>`).join('')}
        </div>`;
    }
    
    if (verificarPeso.productosConPeso > 0) {
        let detalleProductos = verificarPeso.productosAfectados.map(p => 
            `<div style="display:flex; justify-content:space-between; padding:4px 0; font-size:0.9rem; border-bottom:1px solid #f0f0f0;">
                <span>${p.nombre}</span><span>${p.cantidad} x ${p.pesoUnitario} kg = ${p.pesoTotal.toFixed(2)} kg</span>
            </div>`
        ).join('');
        
        const pesoRestante = PESO_MINIMO_TONELADA - verificarPeso.pesoTotal;
        
        html += `<div style="margin-top:1.5rem; padding:1.5rem; border-radius:12px; background:${verificarPeso.cumple ? '#dcfce7' : '#fef3c7'}; border:2px solid ${verificarPeso.cumple ? '#bbf7d0' : '#fde68a'};">
            <div style="font-weight:700; color:${verificarPeso.cumple ? '#16a34a' : '#92400e'}; margin-bottom:0.5rem;">
                ${verificarPeso.cumple ? '✅ ¡Peso mínimo cumplido!' : '⚠️ Peso mínimo requerido'}
            </div>
            <div style="background:white; padding:0.8rem; border-radius:8px;">${detalleProductos}
                <div style="display:flex; justify-content:space-between; font-weight:700; padding-top:0.5rem; margin-top:0.5rem; border-top:2px solid #e2e8f0;">
                    <span>TOTAL PESO</span><span>${verificarPeso.pesoTotal.toFixed(2)} kg</span>
                </div>
            </div>
            ${!verificarPeso.cumple ? `<p style="margin:0.5rem 0 0 0; font-weight:600; color:#92400e;">⚠️ Te faltan ${pesoRestante.toFixed(2)} kg</p>` : ''}
        </div>`;
    }
    
    cartContent.innerHTML = html;
    cartTotales.style.display = 'block';
    
    document.getElementById('subtotalSinDescuento').textContent = formatoMexicano(subtotalSinDescuento);
    document.getElementById('descuentoTotal').textContent = '-' + formatoMexicano(descuentoTotal);
    document.getElementById('subtotal').textContent = formatoMexicano(subtotal);
    document.getElementById('iva').textContent = formatoMexicano(iva);
    document.getElementById('total').textContent = formatoMexicano(total);
    
    let puedeComprar = true;
    if (verificarPeso.productosConPeso > 0 && !verificarPeso.cumple) puedeComprar = false;
    if (!verificarMinPiezas.cumple) puedeComprar = false;
    btnComprar.disabled = !puedeComprar;
}

// ============================================
// MODAL DE DIRECCIÓN
// ============================================

function abrirModalDireccion() {
    if (carrito.length === 0) {
        mostrarNotificacion('⚠️ El carrito está vacío');
        return;
    }
    
    const verificarPeso = verificarPesoMinimo();
    if (verificarPeso.productosConPeso > 0 && !verificarPeso.cumple) {
        mostrarNotificacion('⚠️ Debes completar el peso mínimo de 1 tonelada');
        return;
    }
    
    if (!verificarMinimoPiezas().cumple) {
        mostrarNotificacion('⚠️ Debes completar el mínimo de piezas');
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
        mostrarMensajeModalDireccion('error', '⚠️ La URL de Google Maps es obligatoria.');
        return;
    }
    if (!calle || !colonia || !alcaldia || !estado || !cp || !telefono || !nombreRecibe) {
        mostrarMensajeModalDireccion('error', '⚠️ Completa todos los campos obligatorios.');
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
        mostrarMensajeModalDireccion('error', '⚠️ Asigna un nombre a la dirección.');
        return;
    }
    
    if (!nombreDireccion) nombreDireccion = 'Sin nombre';
    
    if (guardarDireccion && nombreDireccion !== 'Sin nombre') {
        const guardado = await guardarNuevaDireccion({
            nombre: nombreDireccion, calle, colonia, alcaldia, estado, cp, mapsUrl, telefono, nombreRecibe
        });
        if (!guardado) {
            mostrarMensajeModalDireccion('error', '❌ Error al guardar la dirección.');
            return;
        }
    }
    
    window.datosEnvio = {
        calle, colonia, alcaldia, estado, cp, mapsUrl, telefono, nombreRecibe, nombreDireccion
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
    
    const esDespuesDe540 = (horaActual > 17) || (horaActual === 17 && minutosActuales >= 40);
    const diasBloqueados = esDespuesDe540 ? 2 : 1;
    
    const fechaMinima = new Date(ahora);
    fechaMinima.setDate(fechaMinima.getDate() + diasBloqueados);
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
        
        const fechaStr = fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0') + '-' + String(fecha.getDate()).padStart(2, '0');
        const diaNumero = fecha.getDate();
        const mesNombre = fecha.toLocaleDateString('es-MX', { month: 'short' });
        
        let deshabilitado = false;
        let motivoBloqueo = '';
        
        if (esHoy) {
            deshabilitado = true;
            motivoBloqueo = 'Hoy no disponible';
        } else if (esFinDeSemana) {
            deshabilitado = true;
            motivoBloqueo = 'Fin de semana';
        } else if (esAntesDeFechaMinima) {
            deshabilitado = true;
            motivoBloqueo = esDespuesDe540 ? 'Requiere 2 días de anticipación (después de 5:40 pm)' : 'Requiere 1 día de anticipación';
        }
        
        const estilo = deshabilitado 
            ? 'background:#f3f4f6; color:#9ca3af; cursor:not-allowed; padding:0.8rem 0.3rem; border-radius:8px; font-size:0.85rem;'
            : 'background:white; color:var(--primary-dark); cursor:pointer; padding:0.8rem 0.3rem; border-radius:8px; border:2px solid #e2e8f0; font-size:0.85rem; transition:all 0.2s;';
        
        const onclick = deshabilitado ? '' : `onclick="seleccionarFechaEntrega('${fechaStr}', '${fecha.toLocaleDateString('es-MX', {weekday:'long', day:'numeric', month:'long', year:'numeric'})}')"`;
        const title = deshabilitado ? `title="${motivoBloqueo}"` : '';
        
        html += `
            <div class="${deshabilitado ? 'dia-deshabilitado' : 'dia-disponible'}" style="${estilo}" ${onclick} ${title}>
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
// MODAL DE PAGO
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
            btnCredito.style.opacity = '1';
            btnCredito.style.cursor = 'pointer';
        } else {
            btnCredito.style.display = 'block';
            btnCredito.disabled = true;
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
    comprobanteBase64 = null;
    comprobanteNombre = null;
    comprobanteTipo = null;
    document.getElementById('fileName').textContent = 'Ningún archivo seleccionado';
    infoCreditoCalculado = null;
    window._infoCredito = null;
    window._esCreditoParcial = false;
    window._puedeUsarCredito = false;
}

function seleccionarPago(tipo) {
    pagoSeleccionado = tipo;
    document.querySelectorAll('.opciones-pago button').forEach(b => b.classList.remove('selected'));
    document.getElementById('modalMensaje').style.display = 'none';
    
    const formTransferencia = document.getElementById('formTransferencia');
    const formCredito = document.getElementById('formCredito');
    const btnConfirmarCredito = document.getElementById('btnConfirmarCredito');
    const btnConfirmarTransferencia = document.getElementById('btnConfirmarTransferencia');
    
    if (tipo === 'transferencia') {
        document.getElementById('btnTransferencia').classList.add('selected');
        formTransferencia.style.display = 'block';
        formCredito.style.display = 'none';
        document.getElementById('montoTransferencia').textContent = formatoMexicano(calcularTotal());
        if (btnConfirmarCredito) btnConfirmarCredito.style.display = 'none';
        if (btnConfirmarTransferencia) {
            btnConfirmarTransferencia.style.display = 'block';
            btnConfirmarTransferencia.innerHTML = '<i class="fas fa-paper-plane"></i> Confirmar Compra';
        }
        validarCamposTransferencia();
    } else if (tipo === 'credito') {
        document.getElementById('btnCredito').classList.add('selected');
        formCredito.style.display = 'block';
        formTransferencia.style.display = 'none';
        
        const infoCredito = window._infoCredito;
        const esCreditoParcial = window._esCreditoParcial || false;
        const montoExcedente = window._montoExcedente || 0;
        
        if (esCreditoParcial && infoCredito && infoCredito.excedeLimite) {
            document.getElementById('modalMensaje').innerHTML = `
                <div style="background:#fef3c7; padding:1rem; border-radius:12px; margin-bottom:1rem; border:1px solid #fde68a;">
                    <p style="margin:0; font-weight:600; color:#92400e;">⚠️ Excedes el límite de crédito</p>
                    <p style="margin:0.5rem 0 0 0; font-size:0.9rem; color:#92400e;">
                        <strong>Monto a pagar (excedente):</strong> ${formatoMexicano(montoExcedente)}<br>
                        <strong>Monto a crédito:</strong> ${formatoMexicano(infoCredito.montoCredito)}
                    </p>
                </div>`;
            document.getElementById('modalMensaje').style.display = 'block';
            formTransferencia.style.display = 'block';
            document.getElementById('montoTransferencia').textContent = formatoMexicano(montoExcedente);
            if (btnConfirmarTransferencia) btnConfirmarTransferencia.style.display = 'none';
            if (btnConfirmarCredito) {
                btnConfirmarCredito.style.display = 'block';
                btnConfirmarCredito.innerHTML = '<i class="fas fa-university"></i> Pagar Excedente y Finalizar';
                btnConfirmarCredito.disabled = true;
            }
            validarCamposCreditoParcial();
        } else {
            formTransferencia.style.display = 'none';
            if (btnConfirmarTransferencia) btnConfirmarTransferencia.style.display = 'none';
            if (btnConfirmarCredito) {
                btnConfirmarCredito.style.display = 'block';
                btnConfirmarCredito.innerHTML = '<i class="fas fa-check"></i> Confirmar Crédito';
                btnConfirmarCredito.disabled = false;
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
        } else {
            btnConfirmar.disabled = true;
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
        } else {
            btnConfirmar.disabled = true;
        }
    }
}

function cargarComprobante(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64String = e.target.result;
        comprobanteBase64 = base64String.split(',')[1] || base64String;
        comprobanteNombre = file.name;
        comprobanteTipo = file.type;
        document.getElementById('fileName').textContent = file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
        if (pagoSeleccionado === 'transferencia') validarCamposTransferencia();
        else if (pagoSeleccionado === 'credito' && window._esCreditoParcial) validarCamposCreditoParcial();
    };
    reader.readAsDataURL(file);
}

function cargarComprobanteCredito(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64String = e.target.result;
        comprobanteCreditoBase64 = base64String.split(',')[1] || base64String;
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
            if (pagoSeleccionado === 'transferencia') validarCamposTransferencia();
            else if (pagoSeleccionado === 'credito' && window._esCreditoParcial) validarCamposCreditoParcial();
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

function verificarCreditoDisponible() {
    const productosConPeso = carrito.filter(item => {
        const producto = productosGlobales.find(p => p.clave === item.clave);
        return producto && producto.pesoCondicion === 'SI' && producto.peso > 0;
    });
    const productosSinPeso = carrito.filter(item => {
        const producto = productosGlobales.find(p => p.clave === item.clave);
        return producto && (producto.pesoCondicion !== 'SI' || producto.peso === 0);
    });
    
    let pesoTotal = 0;
    productosConPeso.forEach(item => {
        const producto = productosGlobales.find(p => p.clave === item.clave);
        if (producto) pesoTotal += producto.peso * item.cantidad;
    });
    
    let montoSinPeso = 0;
    productosSinPeso.forEach(item => {
        const producto = productosGlobales.find(p => p.clave === item.clave);
        if (producto) {
            const pf = obtenerPrecioFinal(producto);
            const d = calcularDescuentoProducto(producto, item.cantidad);
            montoSinPeso += pf.precio * item.cantidad * (1 - d / 100);
        }
    });
    
    let montoConPeso = 0;
    productosConPeso.forEach(item => {
        const producto = productosGlobales.find(p => p.clave === item.clave);
        if (producto) {
            const pf = obtenerPrecioFinal(producto);
            const d = calcularDescuentoProducto(producto, item.cantidad);
            montoConPeso += pf.precio * item.cantidad * (1 - d / 100);
        }
    });
    
    const totalGeneral = montoConPeso + montoSinPeso;
    const hayProductosConPeso = productosConPeso.length > 0;
    const hayProductosSinPeso = productosSinPeso.length > 0;
    
    if (!clienteCreditoHabilitado) {
        return { puedeCredito: false, tipo: 'no_habilitado', excedeLimite: true, puedeUsarCredito: false, montoPago: totalGeneral, montoCredito: 0, montoExcedente: totalGeneral };
    }
    
    if (hayProductosConPeso && !hayProductosSinPeso) {
        if (pesoTotal <= clienteLimiteCreditoPeso) {
            return { puedeCredito: true, tipo: 'credito_total', excedeLimite: false, puedeUsarCredito: true, montoPago: 0, montoCredito: totalGeneral, montoExcedente: 0, productosCredito: carrito, productosPago: [] };
        }
        return { puedeCredito: true, tipo: 'credito_parcial', excedeLimite: true, puedeUsarCredito: true, montoPago: totalGeneral, montoCredito: 0, montoExcedente: totalGeneral, productosCredito: carrito, productosPago: [] };
    }
    
    if (!hayProductosConPeso && hayProductosSinPeso) {
        if (montoSinPeso <= clienteLimiteCreditoMonto) {
            return { puedeCredito: true, tipo: 'credito_total', excedeLimite: false, puedeUsarCredito: true, montoPago: 0, montoCredito: totalGeneral, montoExcedente: 0, productosCredito: carrito, productosPago: [] };
        }
        return { puedeCredito: true, tipo: 'credito_parcial', excedeLimite: true, puedeUsarCredito: true, montoPago: totalGeneral, montoCredito: 0, montoExcedente: totalGeneral, productosCredito: carrito, productosPago: [] };
    }
    
    if (pesoTotal <= clienteLimiteCreditoPeso && montoSinPeso <= clienteLimiteCreditoMonto) {
        return { puedeCredito: true, tipo: 'credito_total', excedeLimite: false, puedeUsarCredito: true, montoPago: 0, montoCredito: totalGeneral, montoExcedente: 0, productosCredito: carrito, productosPago: [] };
    }
    
    return { puedeCredito: true, tipo: 'credito_parcial', excedeLimite: true, puedeUsarCredito: true, montoPago: totalGeneral, montoCredito: 0, montoExcedente: totalGeneral, productosCredito: carrito, productosPago: [] };
}

// ============================================
// PROCESAR PAGOS
// ============================================

async function procesarPagoTransferencia() {
    const referencia = document.getElementById('referenciaTransferencia').value.trim();
    if (!referencia) return mostrarMensajeModal('error', '⚠️ Referencia obligatoria');
    if (!comprobanteBase64) return mostrarMensajeModal('error', '⚠️ Sube el comprobante');
    if (requiereFactura && !datosFacturaSeleccionados) return mostrarMensajeModal('error', '⚠️ Selecciona razón social');
    
    const btn = document.getElementById('btnConfirmarTransferencia');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="loading-spinner"></span> Procesando...'; }
    
    try {
        const total = calcularTotal();
        const folio = generarFolio();
        const fecha = new Date();
        
        const datosVenta = {
            folio, fecha, cliente: clienteData,
            direccion: window.datosEnvio || null,
            productos: carrito.map(i => ({ ...i, _tipo: 'pago' })),
            total, subtotal: total / 1.16, iva: total - (total / 1.16),
            tipoPago: 'Transferencia', referencia,
            comprobante: comprobanteBase64, comprobanteNombre, comprobanteTipo,
            sucursal: SUCURSAL_WEB,
            nombreDireccion: window.datosEnvio?.nombreDireccion || 'Sin nombre',
            requiereFactura, datosFactura: datosFacturaSeleccionados,
            montoPago: total, montoCredito: 0, estadoPago: 'Validando pago',
            esCreditoParcial: false, diasCredito: 0, fechaPago: null,
            saldoPendiente: 0, anticipo: total
        };
        
        await guardarVentaEnEstadisticas(datosVenta);
        await enviarCorreoConAdjuntoAppsScript(datosVenta);
        generarPDFComprobante(datosVenta);
        
        mostrarMensajeModal('exito', `✅ ¡Compra realizada!<br><strong>Folio:</strong> ${folio}<br><strong>Total:</strong> ${formatoMexicano(total)}`);
        
        carrito = [];
        renderizarCarrito();
        window.datosEnvio = null;
        window.fechaEntregaSeleccionada = null;
        
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Confirmar Compra'; }
        setTimeout(() => { cerrarModalPago(); cargarHistorialCompras(); }, 6000);
    } catch (error) {
        console.error('Error:', error);
        mostrarMensajeModal('error', '❌ Error al procesar el pago.');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Confirmar Compra'; }
    }
}

async function procesarPagoCredito() {
    const dias = DIAS_CREDITO_FIJO;
    const total = calcularTotal();
    if (!window._puedeUsarCredito) return mostrarMensajeModal('error', '⚠️ No puedes usar crédito.');
    if (requiereFactura && !datosFacturaSeleccionados) return mostrarMensajeModal('error', '⚠️ Selecciona razón social');
    
    const btn = document.getElementById('btnConfirmarCredito');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="loading-spinner"></span> Procesando...'; }
    
    try {
        const folio = generarFolio();
        const fecha = new Date();
        const fechaPago = new Date(fecha);
        fechaPago.setDate(fechaPago.getDate() + dias);
        
        const datosVenta = {
            folio, fecha, cliente: clienteData,
            direccion: window.datosEnvio || null,
            productos: carrito.map(i => ({ ...i, _tipo: 'credito' })),
            total, subtotal: total / 1.16, iva: total - (total / 1.16),
            tipoPago: 'Crédito', diasCredito: dias, anticipo: 0,
            saldoPendiente: total, fechaPago, sucursal: SUCURSAL_WEB,
            nombreDireccion: window.datosEnvio?.nombreDireccion || 'Sin nombre',
            requiereFactura, datosFactura: datosFacturaSeleccionados,
            montoPago: 0, montoCredito: total, estadoPago: 'En preparación',
            esCreditoParcial: false, referencia: 'CRÉDITO',
            comprobante: null, comprobanteNombre: null, comprobanteTipo: null
        };
        
        await guardarVentaEnEstadisticas(datosVenta);
        await enviarCorreoConAdjuntoAppsScript(datosVenta);
        generarPDFComprobante(datosVenta);
        
        mostrarMensajeModal('exito', `✅ ¡Crédito aprobado!<br><strong>Folio:</strong> ${folio}<br><strong>Total:</strong> ${formatoMexicano(total)}<br><strong>Fecha de pago:</strong> ${fechaPago.toLocaleDateString('es-MX')}`);
        
        carrito = [];
        renderizarCarrito();
        window.datosEnvio = null;
        window.fechaEntregaSeleccionada = null;
        
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Confirmar Crédito'; }
        setTimeout(() => { cerrarModalPago(); cargarHistorialCompras(); }, 6000);
    } catch (error) {
        console.error('Error:', error);
        mostrarMensajeModal('error', '❌ Error al procesar el crédito.');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Confirmar Crédito'; }
    }
}

function mostrarMensajeModal(tipo, mensaje) {
    const div = document.getElementById('modalMensaje');
    div.className = tipo === 'exito' ? 'mensaje-exito' : 'mensaje-error';
    div.innerHTML = mensaje;
    div.style.display = 'block';
}

// ============================================
// GUARDAR VENTA EN ESTADÍSTICAS (CON FECHA ENTREGA)
// ============================================

async function guardarVentaEnEstadisticas(datos) {
    try {
        console.log('📊 Guardando venta...', datos.tipoPago);
        
        const fechaFormateada = (() => {
            const dd = String(datos.fecha.getDate()).padStart(2, '0');
            const mm = String(datos.fecha.getMonth() + 1).padStart(2, '0');
            const yyyy = datos.fecha.getFullYear();
            const hh = String(datos.fecha.getHours()).padStart(2, '0');
            const mi = String(datos.fecha.getMinutes()).padStart(2, '0');
            const ss = String(datos.fecha.getSeconds()).padStart(2, '0');
            return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
        })();
        
        // Procesar productos
        for (const producto of datos.productos) {
            let precioCompra = 0;
            let ganancia = 0;
            const productoCompleto = productosGlobales.find(p => p.clave === producto.clave);
            if (productoCompleto) {
                precioCompra = productoCompleto.precioCompra || 0;
                ganancia = producto.importe - (precioCompra * producto.cantidad);
            }
            
            let creditoPendiente = 0;
            let montoPagado = 0;
            let diasCredito = 0;
            let fechaPago = '';
            
            const esCredito = datos.tipoPago === 'Crédito' || datos.tipoPago === 'Crédito Parcial';
            
            if (esCredito) {
                if (producto._tipo === 'credito') {
                    if (datos.total > 0 && datos.montoCredito > 0) {
                        creditoPendiente = datos.montoCredito * (producto.importe / datos.total);
                    } else {
                        creditoPendiente = producto.importe;
                    }
                    diasCredito = datos.diasCredito || DIAS_CREDITO_FIJO;
                    fechaPago = datos.fechaPago ? datos.fechaPago.toLocaleDateString('es-MX') : '';
                } else if (producto._tipo === 'pago') {
                    montoPagado = producto.importe;
                }
            }
            
            const filaProducto = [
                fechaFormateada, datos.folio, producto.nombre, producto.cantidad,
                producto.importe.toFixed(2), ganancia.toFixed(2), '',
                creditoPendiente.toFixed(2), montoPagado.toFixed(2),
                diasCredito, fechaPago, datos.sucursal
            ];
            
            await guardarFilaGoogleSheets(HOJA_EST_PRODUCTOS, filaProducto);
        }
        
        // Procesar cliente
        const facturaTexto = datos.requiereFactura ? 'SÍ' : 'NO';
        const formaPago = datos.tipoPago === 'Transferencia' ? 'Transferencia bancaria' :
                          datos.tipoPago === 'Crédito' ? 'Crédito' :
                          datos.tipoPago === 'Crédito Parcial' ? 'Crédito parcial' : datos.tipoPago;
        const tipoPago = datos.tipoPago === 'Crédito' || datos.tipoPago === 'Crédito Parcial' ? 'Pago diferido en parcialidades' : 'Pago en una sola exhibición';
        const estadoPago = datos.estadoPago || 'Validando pago';
        const nombreDireccion = datos.nombreDireccion || 'Sin nombre';
        let razonSocialFactura = (datos.requiereFactura && datos.datosFactura) ? datos.datosFactura.razonSocial : '';
        
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
        
        // ⭐ Fecha de entrega (columna Q)
        let fechaEntregaFormateada = '';
        if (window.fechaEntregaSeleccionada && window.fechaEntregaSeleccionada.iso) {
            const [y, m, d] = window.fechaEntregaSeleccionada.iso.split('-');
            fechaEntregaFormateada = `${d}/${m}/${y}`;
        }
        
        const filaCliente = [
            fechaFormateada, datos.folio, datos.cliente.codigo, datos.cliente.nombre,
            datos.total.toFixed(2), creditoPendienteTotal.toFixed(2), montoPagadoTotal.toFixed(2),
            facturaTexto, datos.sucursal, formaPago, tipoPago, '', estadoPago,
            nombreDireccion, razonSocialFactura, '',
            fechaEntregaFormateada  // ⭐ Columna Q
        ];
        
        await guardarFilaGoogleSheets(HOJA_EST_CLIENTES, filaCliente);
        console.log('✅ Venta guardada');
    } catch (error) {
        console.error('❌ Error guardando venta:', error);
        throw error;
    }
}

// ============================================
// CORREO
// ============================================

async function enviarCorreoConAdjuntoAppsScript(datos) {
    try {
        let productosTexto = '';
        if (datos.productos && datos.productos.length > 0) {
            productosTexto = 'Cant. | Producto | Precio | Dto.% | Importe\n';
            datos.productos.forEach(p => {
                productosTexto += `${p.cantidad} | ${p.nombre} | $${Number(p.precio).toFixed(2)} | ${p.descuento}% | $${Number(p.importe).toFixed(2)}\n`;
            });
        }
        
        const asunto = datos.esLiquidacionCredito 
            ? `PAGO DE CREDITO - ${datos.folio} - ${datos.cliente.nombre}`
            : `NUEVA VENTA WEB - ${datos.folio} - ${datos.cliente.nombre}`;
        
        const payload = {
            action: 'enviarCorreoAdjunto',
            email: 'ventas@proconstruccionmx.com',
            asunto, folio: datos.folio,
            fecha: datos.fecha.toLocaleString('es-MX'),
            cliente_nombre: datos.cliente.nombre,
            tipo_pago: datos.tipoPago,
            referencia: datos.referencia || 'N/A',
            comprobante_nombre: datos.comprobanteNombre || 'No adjunto',
            comprobanteBase64: datos.comprobante || null,
            comprobanteTipo: datos.comprobanteTipo || 'image/jpeg',
            productos_texto: productosTexto,
            subtotal: Number(datos.subtotal).toFixed(2),
            iva: Number(datos.iva).toFixed(2),
            total: Number(datos.total).toFixed(2),
            anio: new Date().getFullYear(),
            direccion_nombre: datos.nombreDireccion || 'Sin nombre',
            direccion_calle: datos.direccion?.calle || '',
            direccion_colonia: datos.direccion?.colonia || '',
            direccion_alcaldia: datos.direccion?.alcaldia || '',
            direccion_estado: datos.direccion?.estado || '',
            direccion_cp: datos.direccion?.cp || '',
            direccion_telefono: datos.direccion?.telefono || '',
            direccion_recibe: datos.direccion?.nombreRecibe || '',
            requiere_factura: datos.requiereFactura || false,
            factura_razon_social: datos.datosFactura?.razonSocial || '',
            factura_rfc: datos.datosFactura?.rfc || ''
        };
        
        await fetch('https://script.google.com/macros/s/AKfycbzxjyFsLB6go3gcMz1qPNou1HhxsugQoiLvKPl0GAwLOQJZKdEcOyK-QxFU64WukWCY/exec', {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        
        console.log('✅ Correo enviado');
    } catch (error) {
        console.error('❌ Error enviando correo:', error);
    }
}

// ============================================
// PDF COMPROBANTE
// ============================================

function generarPDFComprobante(datos) {
    try {
        const hoy = new Date();
        const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
        const fechaFormateada = `${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`;
        
        let tablaProductos = datos.productos.map(p => `
            <tr>
                <td>${p.nombre}</td>
                <td>${formatoMexicano(p.precio)}</td>
                <td>${p.cantidad}</td>
                <td>${p.descuento}%</td>
                <td>${formatoMexicano(p.importe)}</td>
            </tr>
        `).join('');
        
        let infoCreditoHTML = '';
        if (datos.tipoPago === 'Crédito' || datos.tipoPago === 'Crédito Parcial') {
            infoCreditoHTML = `
                <div style="background:#fff3cd;padding:15px;border-radius:8px;margin:20px 0;border:1px solid #ffeaa7;">
                    <h3 style="color:#856404;margin-top:0;">Condiciones de Crédito</h3>
                    <p><strong>Saldo pendiente:</strong> ${formatoMexicano(datos.saldoPendiente || datos.total)}</p>
                    <p><strong>Días de crédito:</strong> ${datos.diasCredito || 20} días</p>
                </div>`;
        }
        
        let fechaEntregaHTML = '';
        if (window.fechaEntregaSeleccionada) {
            fechaEntregaHTML = `
                <div style="background:#dcfce7;padding:15px;border-radius:8px;margin:20px 0;border:1px solid #bbf7d0;">
                    <p style="margin:0;color:#16a34a;"><strong>📅 Fecha de entrega programada:</strong> ${window.fechaEntregaSeleccionada.texto}</p>
                </div>`;
        }
        
        const htmlContent = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;padding:30px;}
.titulo{text-align:center;font-size:20px;font-weight:bold;margin-bottom:2px;}
.rfc{text-align:center;font-size:14px;margin-bottom:15px;}
.header{display:flex;justify-content:space-between;margin-bottom:30px;padding-bottom:20px;border-bottom:2px solid #2a3990;}
table{width:100%;border-collapse:collapse;margin:25px 0;font-size:12px;}
th{background:#2a3990;color:white;padding:15px 8px;text-align:left;}
td{padding:12px 8px;border-bottom:1px solid #e0e0e0;}
.totales{text-align:right;}
.total-row{font-weight:bold;font-size:16px;color:#2a3990;}
.footer{text-align:center;margin-top:40px;padding-top:20px;border-top:1px solid #2a3990;font-size:11px;color:#666;}
</style></head><body>
<div class="titulo">PROCONSTRUCCIONMX SAS DE CV</div>
<div class="rfc">RFC: PRO2605135X4</div>
<div class="header">
<div><img src="https://i.imgur.com/1T3PCYR.png" style="max-width:150px;"></div>
<div style="text-align:right;"><p style="font-size:18px;font-weight:bold;color:#2a3990;">${datos.folio}</p><p>${fechaFormateada}</p></div>
</div>
<div><h3 style="color:#2a3990;">Datos del Cliente</h3>
<p><strong>Nombre:</strong> ${datos.cliente.nombre}</p>
<p><strong>Código:</strong> ${datos.cliente.codigo}</p>
<p><strong>Método de pago:</strong> ${datos.tipoPago}</p></div>
${infoCreditoHTML}
${fechaEntregaHTML}
<table><thead><tr><th>Producto</th><th>Precio Unit.</th><th>Cantidad</th><th>Descuento</th><th>Importe</th></tr></thead>
<tbody>${tablaProductos}</tbody></table>
<div class="totales">
<p><strong>Subtotal:</strong> ${formatoMexicano(datos.subtotal)}</p>
<p><strong>IVA (16%):</strong> ${formatoMexicano(datos.iva)}</p>
<p class="total-row"><strong>Total:</strong> ${formatoMexicano(datos.total)}</p>
</div>
<div class="footer"><p><strong>ProConstrucción MX</strong></p><p>📧 ventas@proconstruccionmx.com</p><p>¡Gracias por su preferencia!</p></div>
</body></html>`;
        
        const ventana = window.open('', '_blank', 'width=800,height=600');
        if (ventana) {
            ventana.document.write(htmlContent);
            ventana.document.close();
            ventana.focus();
            setTimeout(() => ventana.print(), 1000);
            setTimeout(() => ventana.close(), 5000);
        }
        console.log('✅ PDF generado');
    } catch (error) {
        console.error('❌ Error generando PDF:', error);
    }
}

// ============================================
// HISTORIAL DE COMPRAS
// ============================================

async function cargarHistorialCompras() {
    try {
        const codigoCliente = sessionStorage.getItem('codigoCliente');
        if (!codigoCliente) return;
        
        const urlClientes = `${WORKER_URL}/leer?sheetId=${ID_ESTADISTICAS}&sheetName=${HOJA_EST_CLIENTES}`;
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
            if (fecha && typeof fecha === 'object' && fecha.v !== undefined) fecha = fecha.v;
            
            const total = parseFloat(values[4]) || 0;
            const estado = String(values[12] || '').trim();
            const formaPago = String(values[9] || '').trim();
            const creditoPendiente = parseFloat(values[5]) || 0;
            const montoPagado = parseFloat(values[6]) || 0;
            const estatusPago = String(values[15] || '').trim();
            const validado = estatusPago.toUpperCase() === 'VALIDADO';
            const fechaEntrega = String(values[16] || '').trim();  // ⭐ Columna Q
            
            if (codigo === codigoCliente && idVenta) {
                idsVenta.push(idVenta);
                const fechaObj = parseFechaGoogleSheets(fecha);
                ventasMap.set(idVenta, {
                    idVenta, fecha, fechaObj, total,
                    estado: estado || 'Validando pago',
                    codigoCliente: codigo,
                    tipoPago: formaPago,
                    saldoPendiente: creditoPendiente,
                    montoPagado, anticipo: montoPagado,
                    estatusPago, validado,
                    fechaEntrega: fechaEntrega  // ⭐ Nueva
                });
            }
        }
        
        if (idsVenta.length === 0) {
            renderizarHistorialVacio();
            return;
        }
        
        const urlProductos = `${WORKER_URL}/leer?sheetId=${ID_ESTADISTICAS}&sheetName=${HOJA_EST_PRODUCTOS}`;
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
            const diasCredito = parseFloat(values[9]) || 0;
            const fechaPagoStr = String(values[10] || '').trim();
            
            if (idsVenta.includes(idVenta) && nombreProducto) {
                if (!productosPorVenta.has(idVenta)) productosPorVenta.set(idVenta, []);
                productosPorVenta.get(idVenta).push({ nombre: nombreProducto, cantidad, importe });
                
                const ventaInfo = ventasMap.get(idVenta);
                if (ventaInfo) {
                    ventaInfo.diasCredito = diasCredito || ventaInfo.diasCredito || 0;
                    if (fechaPagoStr && !ventaInfo.fechaPago) ventaInfo.fechaPago = fechaPagoStr;
                }
                
                if (contadorProductos.has(nombreProducto)) {
                    const data = contadorProductos.get(nombreProducto);
                    data.cantidad += cantidad;
                    data.veces++;
                    data.totalImporte += importe;
                } else {
                    contadorProductos.set(nombreProducto, {
                        nombre: nombreProducto, cantidad, veces: 1, totalImporte: importe
                    });
                }
            }
        }
        
        historialVentas = [];
        for (const [idVenta, info] of ventasMap) {
            const productos = productosPorVenta.get(idVenta) || [];
            const subtotal = productos.reduce((sum, p) => sum + p.importe, 0);
            historialVentas.push({
                ...info, productos, subtotal,
                iva: subtotal * 0.16,
                totalConIva: subtotal * 1.16,
                fechaPago: info.fechaPago || null,
                diasCredito: info.diasCredito || 0,
                estatusPago: info.estatusPago || ''
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
        
        console.log(`📦 Historial: ${historialVentas.length} ventas`);
        renderizarOrdenes();
        renderizarHistorialCompras();
        renderizarEstadisticasProductos();
        cargarCreditosPendientesConValidacion();
    } catch (error) {
        console.error('❌ Error cargando historial:', error);
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
        return fecha && fecha >= hace15Dias;
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
        const fechaFormateada = fecha ? fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Fecha no disponible';
        
        if (index < ordenesRecientes.length - 1) {
            html += `<div style="position:absolute; left:10px; top:40px; bottom:0; width:2px; background:#e5e7eb;"></div>`;
        }
        
        html += `
            <div style="position:relative; margin-bottom: 2rem; padding-left: 1.5rem; cursor:pointer;" onclick="verDetalleVenta('${venta.idVenta}')">
                <div style="position:absolute; left:-2px; top:5px; width:20px; height:20px; border-radius:50%; background:${color}; display:flex; align-items:center; justify-content:center; z-index:1; box-shadow: 0 0 0 4px rgba(255,255,255,0.8);">
                    <i class="fas ${icon}" style="color:white; font-size:10px;"></i>
                </div>
                <div style="background:white; border-radius:12px; padding:1.2rem 1.5rem; box-shadow:0 2px 8px rgba(0,0,0,0.04); border:1px solid #f3f4f6;">
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
                        <span style="font-size:0.9rem; color:var(--text-gray);"><strong>${venta.productos.length}</strong> productos</span>
                        <span style="font-weight:700; color:var(--primary-dark); font-size:1.1rem;">${formatoMexicano(venta.totalConIva || venta.total)}</span>
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
        ventasFiltradas = ventasFiltradas.filter(v => {
            const fecha = v.fechaObj || parseFechaGoogleSheets(v.fecha);
            return fecha && fecha.getFullYear() === parseInt(filtroAno);
        });
    }
    if (filtroMes && filtroMes !== 'todos') {
        ventasFiltradas = ventasFiltradas.filter(v => {
            const fecha = v.fechaObj || parseFechaGoogleSheets(v.fecha);
            return fecha && (fecha.getMonth() + 1) === parseInt(filtroMes);
        });
    }
    
    const totalPeriodo = ventasFiltradas.reduce((sum, v) => sum + (v.totalConIva || v.total), 0);
    
    if (ventasFiltradas.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><h4>Sin compras en este período</h4><p>No hay registros para los filtros seleccionados.</p></div>`;
        return;
    }
    
    const estadoColors = {
        'Validando pago': '#f59e0b',
        'En preparación': '#3b82f6',
        'En camino': '#8b5cf6',
        'Entregado': '#10b981'
    };
    
    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:0.5rem;">
            <h3 style="margin:0; color:var(--primary-dark);">📋 Historial de Compras</h3>
            <span style="font-weight:700; color:var(--primary-dark); font-size:1.1rem;">Total: ${formatoMexicano(totalPeriodo)}</span>
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
                <thead><tr style="background:#f8f9fa;">
                    <th style="padding:0.8rem; text-align:left; font-weight:600; color:var(--primary-dark); border-bottom:2px solid #e2e8f0;">Folio</th>
                    <th style="padding:0.8rem; text-align:left; font-weight:600; color:var(--primary-dark); border-bottom:2px solid #e2e8f0;">Fecha</th>
                    <th style="padding:0.8rem; text-align:center; font-weight:600; color:var(--primary-dark); border-bottom:2px solid #e2e8f0;">Productos</th>
                    <th style="padding:0.8rem; text-align:right; font-weight:600; color:var(--primary-dark); border-bottom:2px solid #e2e8f0;">Total</th>
                    <th style="padding:0.8rem; text-align:center; font-weight:600; color:var(--primary-dark); border-bottom:2px solid #e2e8f0;">Estatus</th>
                    <th style="padding:0.8rem; text-align:center; font-weight:600; color:var(--primary-dark); border-bottom:2px solid #e2e8f0;">Acción</th>
                </tr></thead>
                <tbody>
    `;
    
    ventasFiltradas.forEach(venta => {
        const estado = venta.estado || 'Validando pago';
        const color = estadoColors[estado] || '#6b7280';
        const fecha = venta.fechaObj || parseFechaGoogleSheets(venta.fecha);
        const fechaFormateada = fecha ? fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Fecha no disponible';
        
        html += `
            <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="padding:0.8rem; font-weight:600; color:var(--primary-dark);">${venta.idVenta}</td>
                <td style="padding:0.8rem; color:var(--text-gray);">${fechaFormateada}</td>
                <td style="padding:0.8rem; text-align:center; color:var(--text-gray);">${venta.productos.length}</td>
                <td style="padding:0.8rem; text-align:right; font-weight:600; color:var(--primary-dark);">${formatoMexicano(venta.totalConIva || venta.total)}</td>
                <td style="padding:0.8rem; text-align:center;">
                    <span style="display:inline-block; padding:0.2rem 1rem; border-radius:50px; font-size:0.75rem; font-weight:600; color:white; background:${color};">${estado}</span>
                </td>
                <td style="padding:0.8rem; text-align:center;">
                    <button onclick="verDetalleVenta('${venta.idVenta}')" style="padding:0.4rem 1rem; background:var(--primary-blue); color:white; border:none; border-radius:8px; cursor:pointer; font-size:0.8rem; font-family:'Inter',sans-serif;">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

function renderizarEstadisticasProductos() {
    const container = document.getElementById('estadisticasContent');
    if (!container) return;
    if (productosMasComprados.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-chart-bar"></i><h4>Sin datos</h4></div>`;
        return;
    }
    
    const topProductos = productosMasComprados.slice(0, 10);
    const maxImporte = topProductos[0].totalImporte;
    
    let html = `<h3 style="margin:0 0 1.5rem 0; color:var(--primary-dark);">📊 Productos más comprados</h3><div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">`;
    topProductos.forEach(prod => {
        const porcentaje = (prod.totalImporte / maxImporte) * 100;
        html += `
            <div style="background:white; border-radius:12px; padding:1rem; border:1px solid #f3f4f6;">
                <div style="display:flex; justify-content:space-between; margin-bottom:0.3rem;">
                    <span style="font-weight:600; color:var(--primary-dark); font-size:0.95rem;">${prod.nombre}</span>
                    <span style="font-weight:700; color:var(--primary-dark); font-size:0.9rem;">${formatoMexicano(prod.totalImporte)}</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-gray); margin-bottom:0.3rem;">
                    <span>${prod.cantidad} unidades</span><span>${prod.veces} compras</span>
                </div>
                <div style="width:100%; height:6px; background:#f3f4f6; border-radius:3px; overflow:hidden;">
                    <div style="height:100%; background:linear-gradient(90deg, #3b82f6, #8b5cf6); width:${porcentaje}%;"></div>
                </div>
            </div>
        `;
    });
    html += `</div>`;
    container.innerHTML = html;
}

function verDetalleVenta(idVenta) {
    const venta = historialVentas.find(v => v.idVenta === idVenta);
    if (!venta) return mostrarNotificacion('❌ No se encontró la venta');
    
    const fecha = venta.fechaObj || parseFechaGoogleSheets(venta.fecha);
    const fechaFormateada = fecha ? fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Fecha no disponible';
    
    let htmlProductos = venta.productos.map(p => `
        <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:0.6rem; color:var(--text-gray);">${p.nombre}</td>
            <td style="padding:0.6rem; text-align:center; color:var(--text-gray);">${p.cantidad}</td>
            <td style="padding:0.6rem; text-align:right; color:var(--text-gray);">${formatoMexicano(p.importe)}</td>
        </tr>
    `).join('');
    
    const total = venta.totalConIva || venta.total;
    const subtotal = total / 1.16;
    const iva = total - subtotal;
    
    const modalHtml = `
        <div id="modalDetalleVenta" class="modal-overlay active" onclick="if(event.target===this) cerrarModalDetalleVenta()">
            <div class="modal" style="max-width:700px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:1.5rem;">
                    <h2 style="color:var(--primary-dark); margin:0;">🧾 ${venta.idVenta}</h2>
                    <button onclick="cerrarModalDetalleVenta()" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:var(--text-gray);"><i class="fas fa-times"></i></button>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1.5rem; background:var(--gray-light); padding:1rem; border-radius:12px;">
                    <div><div style="font-size:0.75rem; color:var(--text-gray);">Fecha</div><div style="font-weight:600; color:var(--primary-dark);">${fechaFormateada}</div></div>
                    <div><div style="font-size:0.75rem; color:var(--text-gray);">Estatus</div><div style="font-weight:600; color:var(--primary-dark);">${venta.estado}</div></div>
                    <div><div style="font-size:0.75rem; color:var(--text-gray);">Productos</div><div style="font-weight:600; color:var(--primary-dark);">${venta.productos.length}</div></div>
                    <div><div style="font-size:0.75rem; color:var(--text-gray);">Total</div><div style="font-weight:700; color:var(--primary-dark); font-size:1.1rem;">${formatoMexicano(total)}</div></div>
                </div>
                <h3 style="color:var(--primary-dark); margin-bottom:0.5rem;">📦 Productos</h3>
                <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
                    <thead><tr style="background:#f8f9fa;">
                        <th style="padding:0.6rem; text-align:left; font-weight:600; color:var(--primary-dark); border-bottom:2px solid #e2e8f0;">Producto</th>
                        <th style="padding:0.6rem; text-align:center; font-weight:600; color:var(--primary-dark); border-bottom:2px solid #e2e8f0;">Cantidad</th>
                        <th style="padding:0.6rem; text-align:right; font-weight:600; color:var(--primary-dark); border-bottom:2px solid #e2e8f0;">Importe</th>
                    </tr></thead>
                    <tbody>${htmlProductos}</tbody>
                </table>
                <div style="text-align:right; padding-top:1rem; margin-top:1rem; border-top:2px solid #e2e8f0;">
                    <p style="margin:0.2rem 0;"><strong>Subtotal:</strong> ${formatoMexicano(subtotal)}</p>
                    <p style="margin:0.2rem 0;"><strong>IVA (16%):</strong> ${formatoMexicano(iva)}</p>
                    <p style="margin:0.2rem 0; font-size:1.2rem; font-weight:700; color:var(--primary-dark);"><strong>Total:</strong> ${formatoMexicano(total)}</p>
                </div>
                <button onclick="cerrarModalDetalleVenta()" class="btn-cerrar-modal" style="margin-top:1rem;"><i class="fas fa-times"></i> Cerrar</button>
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
    ['historialContent', 'ordenesContent', 'estadisticasContent'].forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><h4>Sin compras registradas</h4></div>`;
        }
    });
}

function filtrarHistorial() {
    const ano = document.getElementById('filtroAno')?.value || 'todos';
    const mes = document.getElementById('filtroMes')?.value || 'todos';
    renderizarHistorialCompras(ano, mes);
}

// ============================================
// CRÉDITOS PENDIENTES
// ============================================

function cargarCreditosPendientesConValidacion() {
    const container = document.getElementById('creditosPendientesContent');
    if (!container) return;
    
    const creditosFiltrados = historialVentas.filter(v => {
        const tipoPago = v.tipoPago || '';
        const saldoPendiente = v.saldoPendiente || v.total || 0;
        const esCredito = (tipoPago === 'Crédito' || tipoPago === 'Crédito Parcial');
        const tieneSaldo = saldoPendiente > 0.01;
        if (!esCredito || !tieneSaldo) return false;
        return v.validado !== true;
    });
    
    creditosPendientes = creditosFiltrados;
    
    if (creditosPendientes.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-check-circle" style="color:#16a34a;"></i><h4>Sin créditos pendientes</h4></div>`;
        document.getElementById('totalCreditoPendiente').textContent = 'Total: $0.00';
        return;
    }
    
    const creditosEnProceso = creditosPendientes.filter(v => (v.estatusPago || '') === 'SI');
    const creditosPendientesReales = creditosPendientes.filter(v => (v.estatusPago || '') !== 'SI');
    
    let totalPendiente = 0;
    let html = `<div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">`;
    
    creditosEnProceso.forEach(venta => {
        const saldo = venta.saldoPendiente || venta.total || 0;
        totalPendiente += saldo;
        html += `
            <div style="background:white; border-radius:12px; padding:1.2rem; border:1px solid #bfdbfe;">
                <div style="font-weight:700; color:var(--primary-dark);">${venta.idVenta}</div>
                <div style="font-weight:700; color:#3b82f6; font-size:1.1rem; margin-top:0.5rem;">${formatoMexicano(saldo)}</div>
                <div style="text-align:center; margin-top:0.8rem; padding:0.5rem; background:#eff6ff; border-radius:8px; color:#3b82f6;">
                    <i class="fas fa-spinner fa-spin"></i> Validando pago
                </div>
            </div>
        `;
    });
    
    creditosPendientesReales.forEach(venta => {
        const saldo = venta.saldoPendiente || venta.total || 0;
        totalPendiente += saldo;
        html += `
            <div style="background:white; border-radius:12px; padding:1.2rem; border:1px solid #fef3c7;">
                <div style="font-weight:700; color:var(--primary-dark);">${venta.idVenta}</div>
                <div style="font-weight:700; color:#92400e; font-size:1.1rem; margin-top:0.5rem;">${formatoMexicano(saldo)}</div>
                <button class="btn-primary" style="width:100%; margin-top:0.8rem; padding:0.5rem; font-size:0.85rem;" onclick="abrirModalPagoCreditoPendiente('${venta.idVenta}')">
                    <i class="fas fa-university"></i> Liquidar
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
    if (!venta) return;
    creditoSeleccionadoParaPago = venta;
    const saldo = venta.saldoPendiente || venta.total || 0;
    
    const modalHtml = `
        <div id="modalPagoCredito" class="modal-overlay active" onclick="if(event.target===this) cerrarModalPagoCredito()">
            <div class="modal" style="max-width:500px;">
                <h2>💳 Liquidar Crédito</h2>
                <div style="background:#fef3c7; padding:1rem; border-radius:12px; margin-bottom:1rem;">
                    <p style="margin:0; font-weight:600; color:#92400e;">🧾 ${venta.idVenta}</p>
                    <p style="margin:0.3rem 0 0 0; color:#92400e;"><strong>Saldo pendiente:</strong> ${formatoMexicano(saldo)}</p>
                </div>
                <div class="datos-bancarios">
                    <p><strong>PROCONSTRUCCIONMX SAS DE CV</strong></p>
                    <p><strong>BANCO:</strong> BBVA</p>
                    <p><strong>CUENTA:</strong> 0127744064</p>
                    <p><strong>CLABE:</strong> 012180001277440643</p>
                </div>
                <div class="form-group">
                    <label>Referencia de transferencia <span style="color:red;">*</span></label>
                    <input type="text" id="referenciaTransferenciaCredito" placeholder="Ej: 1234567890">
                </div>
                <div class="form-group">
                    <label>Comprobante <span style="color:red;">*</span></label>
                    <div class="file-upload" onclick="document.getElementById('comprobanteFileCredito').click()">
                        <i class="fas fa-cloud-upload-alt" style="font-size:2rem; color:var(--accent-orange);"></i>
                        <p class="file-name" id="fileNameCredito">Ningún archivo seleccionado</p>
                        <input type="file" id="comprobanteFileCredito" onchange="cargarComprobanteCredito(event)">
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
    if (btn) btn.disabled = !(referencia && archivo && archivo !== 'Ningún archivo seleccionado');
}

function cerrarModalPagoCredito() {
    const modal = document.getElementById('modalPagoCredito');
    if (modal) modal.remove();
    comprobanteCreditoBase64 = null;
    comprobanteCreditoNombre = null;
    creditoSeleccionadoParaPago = null;
}

async function procesarPagoCreditoPendiente() {
    const referencia = document.getElementById('referenciaTransferenciaCredito').value.trim();
    if (!referencia || !comprobanteCreditoBase64 || !creditoSeleccionadoParaPago) return;
    
    const btn = document.getElementById('btnConfirmarPagoCredito');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="loading-spinner"></span> Procesando...'; }
    
    try {
        const venta = creditoSeleccionadoParaPago;
        const saldo = venta.saldoPendiente || venta.total || 0;
        
        const datosVenta = {
            folio: venta.idVenta, fecha: new Date(), cliente: clienteData,
            direccion: null, productos: venta.productos.map(p => ({ ...p, _tipo: 'pago' })),
            total: saldo, subtotal: saldo / 1.16, iva: saldo - (saldo / 1.16),
            tipoPago: 'Transferencia (Liquidación Crédito)', referencia,
            comprobante: comprobanteCreditoBase64, comprobanteNombre: comprobanteCreditoNombre,
            comprobanteTipo: 'image/jpeg', sucursal: SUCURSAL_WEB,
            nombreDireccion: 'Liquidación de crédito',
            requiereFactura: false, datosFactura: null,
            montoPago: saldo, montoCredito: 0, estadoPago: 'Liquidado',
            esLiquidacionCredito: true, idVentaOriginal: venta.idVenta
        };
        
        await guardarVentaEnEstadisticas(datosVenta);
        await enviarCorreoConAdjuntoAppsScript(datosVenta);
        
        await fetch(`${WORKER_URL}/ventas`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'actualizarEstatusPago', idVentaOriginal: venta.idVenta })
        });
        
        mostrarNotificacion('✅ Pago registrado');
        setTimeout(() => { cerrarModalPagoCredito(); cargarHistorialCompras(); }, 3000);
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('❌ Error al procesar');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Confirmar Pago'; }
    }
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
