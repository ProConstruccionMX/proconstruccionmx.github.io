// ============================================
// CONFIGURACIÓN
// ============================================
const ID_PRODUCTOS = '1tRhmgmbhL47vBIldtSFnrvFlFLHYADKq23BKGnRAWQk';
const HOJA_PRODUCTOS = 'Hoja 1';
const ID_BASE_CLIENTES = '1yCQ-cJJ7PALDYSwIcpsj1ZfACtNLJwfOR7HY-mPzgx4';
const HOJA_BASE_CLIENTES = 'Hoja 1';
const ID_VENTAS = '1ncuIR0-QJWl8OcwLUTFoyCZ0qwCafQaXfc0y6vYzFTc';
const HOJA_VENTAS_PRODUCTOS = 'Hoja 1';
const HOJA_VENTAS_CLIENTES = 'Hoja 2';
const ID_ARCHIVO_PRECIOS_ESPECIALES = '10t2A9M5f1Bj7lyTTa_PhVGRv0wAK_4ePpk_1eURZQ5I';
const HOJA_PRECIOS_ESPECIALES = 'Hoja 1';

// ============================================
// VARIABLES GLOBALES
// ============================================
let clienteData = null;
let productosGlobales = [];
let preciosEspecialesGlobales = [];
let carrito = [];
let pagoSeleccionado = null;
let comprobanteBase64 = null;
let comprobanteNombre = null;

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    // Verificar autenticación
    if (sessionStorage.getItem('userLoggedIn') !== 'true') {
        window.location.href = 'login.html';
        return;
    }

    // Obtener datos del cliente
    const email = sessionStorage.getItem('userEmail');
    await cargarDatosCliente(email);
    
    // Cargar productos y precios especiales
    await cargarProductos();
    await cargarPreciosEspeciales();
    
    // Configurar tabs
    configurarTabs();
    
    // Mostrar mensaje de bienvenida
    if (clienteData) {
        document.getElementById('welcomeName').textContent = clienteData.nombre;
    }
});

// ============================================
// FUNCIONES DE CARGA DE DATOS
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
            console.error('Cliente no encontrado');
        }
    } catch (error) {
        console.error('Error al cargar datos del cliente:', error);
    }
}

function actualizarInfoCliente() {
    if (!clienteData) return;
    
    document.getElementById('userNameDisplay').textContent = clienteData.nombre;
    document.getElementById('userEmailDisplay').textContent = clienteData.correo;
    document.getElementById('welcomeName').textContent = clienteData.nombre;
    document.getElementById('clienteCodigo').textContent = clienteData.codigo;
    document.getElementById('clienteGiro').textContent = clienteData.giro || 'Público en general';
    document.getElementById('clienteDescuento').textContent = clienteData.descuento + '%';
    document.getElementById('clienteTelefono').textContent = clienteData.telefono || '---';
}

async function cargarProductos() {
    try {
        const url = `https://docs.google.com/spreadsheets/d/${ID_PRODUCTOS}/gviz/tq?tqx=out:json&sheet=${HOJA_PRODUCTOS}`;
        const response = await fetch(url);
        const text = await response.text();
        const jsonStr = text.substring(text.indexOf('(') + 1, text.lastIndexOf(')'));
        const data = JSON.parse(jsonStr);
        const rows = data.table.rows;
        
        productosGlobales = [];
        for (let i = 1; i < rows.length; i++) {
            const values = rows[i].c.map(cell => cell ? cell.v : '');
            productosGlobales.push({
                clave: String(values[0] || '').trim(),
                nombre: String(values[1] || '').trim(),
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
                descuentoVolumenQ: parseFloat(values[16]) || 0
            });
        }
        console.log('📦 Productos cargados:', productosGlobales.length);
    } catch (error) {
        console.error('Error al cargar productos:', error);
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
        
        html += `
            <div class="product-card">
                <span class="clave">${producto.clave}</span>
                ${producto.pxv === 'PXV' ? '<span class="tag-pxv">📦 Descuento por Volumen</span>' : ''}
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
// FUNCIONES DE PRECIOS Y DESCUENTOS
// ============================================

function obtenerPrecioFinal(producto) {
    // 1. Verificar precio personalizado
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
    
    // 2. Si no hay precio personalizado, usar precio base
    return {
        precio: producto.precio,
        personalizado: false,
        descuentoAplicado: 0
    };
}

function calcularDescuentoProducto(producto, cantidad) {
    // 1. Si tiene precio personalizado, NO hay descuento adicional
    const precioEspecial = preciosEspecialesGlobales.find(p => 
        p.codigoCliente === clienteData.codigo && 
        p.claveProducto === producto.clave
    );
    
    if (precioEspecial) {
        return 0;
    }
    
    // 2. Columna E = "N/A" → Sin descuento
    if (producto.na === 'N/A') {
        return 0;
    }
    
    // 3. Columna E = número → Descuento específico
    const naNumero = parseFloat(producto.na);
    if (!isNaN(naNumero) && producto.na !== '-') {
        return naNumero;
    }
    
    // 4. Columna E = "-" → Descuento por giro
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
    
    // 5. Columna E = "" (vacía) y PXV = "PXV"
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
    
    // 6. Por defecto → Descuento base del cliente
    return clienteData.descuento || 0;
}

// ============================================
// FUNCIONES DEL CARRITO
// ============================================

function agregarAlCarrito(clave) {
    const producto = productosGlobales.find(p => p.clave === clave);
    if (!producto) return;
    
    // Verificar si ya está en el carrito
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
            personalizado: precioFinal.personalizado
        });
    }
    
    renderizarCarrito();
    mostrarNotificacion('✅ Producto agregado al carrito');
}

function actualizarItemCarrito(item) {
    const descuento = calcularDescuentoProducto(
        productosGlobales.find(p => p.clave === item.clave),
        item.cantidad
    );
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
    
    if (carrito.length === 0) {
        cartContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-cart-plus"></i>
                <h4>Carrito vacío</h4>
                <p>Agrega productos desde la lista de resultados.</p>
            </div>
        `;
        cartTotales.style.display = 'none';
        return;
    }
    
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
        
        html += `
            <tr>
                <td>
                    <strong>${item.nombre}</strong>
                    ${item.personalizado ? '<span class="precio-personalizado">⭐ Personalizado</span>' : ''}
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
    
    cartContent.innerHTML = html;
    cartTotales.style.display = 'block';
    
    document.getElementById('subtotalSinDescuento').textContent = formatoMexicano(subtotalSinDescuento);
    document.getElementById('descuentoTotal').textContent = '-' + formatoMexicano(descuentoTotal);
    document.getElementById('subtotal').textContent = formatoMexicano(subtotal);
    document.getElementById('iva').textContent = formatoMexicano(iva);
    document.getElementById('total').textContent = formatoMexicano(total);
}

// ============================================
// FUNCIONES DE PAGO
// ============================================

function abrirModalPago() {
    if (carrito.length === 0) {
        mostrarNotificacion('⚠️ El carrito está vacío');
        return;
    }
    
    const modal = document.getElementById('modalPago');
    modal.classList.add('active');
    
    document.getElementById('modalMensaje').innerHTML = '';
    document.getElementById('formTransferencia').style.display = 'none';
    document.getElementById('formCredito').style.display = 'none';
    
    // Actualizar montos
    const total = calcularTotal();
    document.getElementById('montoTransferencia').textContent = formatoMexicano(total);
    document.getElementById('totalCredito').textContent = formatoMexicano(total);
    
    pagoSeleccionado = null;
    document.querySelectorAll('.opciones-pago button').forEach(b => b.classList.remove('selected'));
}

function cerrarModalPago() {
    document.getElementById('modalPago').classList.remove('active');
    document.getElementById('modalMensaje').innerHTML = '';
    document.getElementById('formTransferencia').style.display = 'none';
    document.getElementById('formCredito').style.display = 'none';
    comprobanteBase64 = null;
    comprobanteNombre = null;
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

function cargarComprobante(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        comprobanteBase64 = e.target.result.split(',')[1];
        comprobanteNombre = file.name;
        document.getElementById('fileName').textContent = file.name;
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
// PROCESAMIENTO DE PAGOS
// ============================================

async function procesarPagoTransferencia() {
    const referencia = document.getElementById('referenciaTransferencia').value.trim();
    
    if (!referencia) {
        mostrarMensajeModal('error', '⚠️ Por favor, ingresa el número de referencia de la transferencia.');
        return;
    }
    
    if (!comprobanteBase64) {
        mostrarMensajeModal('error', '⚠️ Por favor, sube el comprobante de transferencia.');
        return;
    }
    
    const btn = document.querySelector('#formTransferencia .btn-enviar');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Procesando...';
    
    try {
        const total = calcularTotal();
        const folio = generarFolio();
        const fecha = new Date();
        
        // Preparar datos para guardar
        const datosVenta = {
            folio: folio,
            fecha: fecha,
            cliente: clienteData,
            productos: carrito.map(item => ({
                clave: item.clave,
                nombre: item.nombre,
                cantidad: item.cantidad,
                precio: item.precio,
                descuento: item.descuento,
                importe: item.importe,
                precioCompra: item.precioCompra
            })),
            total: total,
            subtotal: total / 1.16,
            iva: total - (total / 1.16),
            tipoPago: 'Transferencia',
            referencia: referencia,
            comprobante: comprobanteBase64,
            comprobanteNombre: comprobanteNombre,
            sucursal: clienteData.sucursal || 'Matriz'
        };
        
        // Guardar en Google Sheets
        await guardarVentaEnSheets(datosVenta);
        
        // Enviar correo
        await enviarCorreoVenta(datosVenta);
        
        mostrarMensajeModal('exito', `
            ✅ ¡Compra realizada con éxito!<br>
            <strong>Folio:</strong> ${folio}<br>
            <strong>Total:</strong> ${formatoMexicano(total)}<br>
            <strong>Método:</strong> Transferencia<br>
            <strong>Referencia:</strong> ${referencia}<br><br>
            Se ha enviado un correo a ventas@proconstruccionmx.com con los detalles.
        `);
        
        // Limpiar carrito
        carrito = [];
        renderizarCarrito();
        
        // Resetear botón
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Confirmar Compra';
        
        // Cerrar modal después de 3 segundos
        setTimeout(() => {
            cerrarModalPago();
        }, 5000);
        
    } catch (error) {
        console.error('Error al procesar pago:', error);
        mostrarMensajeModal('error', '❌ Error al procesar el pago. Por favor, intenta de nuevo o contacta a tu asesor.');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Confirmar Compra';
    }
}

async function procesarPagoCredito() {
    const dias = parseInt(document.getElementById('diasCredito').value) || 30;
    const anticipo = parseFloat(document.getElementById('anticipoCredito').value) || 0;
    const total = calcularTotal();
    
    if (anticipo > total) {
        mostrarMensajeModal('error', '⚠️ El anticipo no puede ser mayor al total.');
        return;
    }
    
    const btn = document.querySelector('#formCredito .btn-enviar');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Procesando...';
    
    try {
        const folio = generarFolio();
        const fecha = new Date();
        const saldoPendiente = total - anticipo;
        const fechaPago = new Date(fecha);
        fechaPago.setDate(fechaPago.getDate() + dias);
        
        const datosVenta = {
            folio: folio,
            fecha: fecha,
            cliente: clienteData,
            productos: carrito.map(item => ({
                clave: item.clave,
                nombre: item.nombre,
                cantidad: item.cantidad,
                precio: item.precio,
                descuento: item.descuento,
                importe: item.importe,
                precioCompra: item.precioCompra
            })),
            total: total,
            subtotal: total / 1.16,
            iva: total - (total / 1.16),
            tipoPago: 'Crédito',
            diasCredito: dias,
            anticipo: anticipo,
            saldoPendiente: saldoPendiente,
            fechaPago: fechaPago,
            sucursal: clienteData.sucursal || 'Matriz'
        };
        
        // Guardar en Google Sheets
        await guardarVentaEnSheets(datosVenta);
        
        // Enviar correo
        await enviarCorreoVenta(datosVenta);
        
        mostrarMensajeModal('exito', `
            ✅ ¡Crédito aprobado!<br>
            <strong>Folio:</strong> ${folio}<br>
            <strong>Total:</strong> ${formatoMexicano(total)}<br>
            <strong>Anticipo:</strong> ${formatoMexicano(anticipo)}<br>
            <strong>Saldo pendiente:</strong> ${formatoMexicano(saldoPendiente)}<br>
            <strong>Días de crédito:</strong> ${dias}<br>
            <strong>Fecha de pago:</strong> ${fechaPago.toLocaleDateString('es-MX')}<br><br>
            Se ha enviado un correo a ventas@proconstruccionmx.com con los detalles.
        `);
        
        // Limpiar carrito
        carrito = [];
        renderizarCarrito();
        
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check"></i> Confirmar Crédito';
        
        setTimeout(() => {
            cerrarModalPago();
        }, 5000);
        
    } catch (error) {
        console.error('Error al procesar crédito:', error);
        mostrarMensajeModal('error', '❌ Error al procesar el crédito. Por favor, intenta de nuevo o contacta a tu asesor.');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check"></i> Confirmar Crédito';
    }
}

// ============================================
// GUARDAR EN GOOGLE SHEETS
// ============================================

async function guardarVentaEnSheets(datos) {
    try {
        // 1. Guardar en Hoja 1 (Productos) - Ventas página
        for (const producto of datos.productos) {
            const datosProducto = [
                datos.fecha.toISOString().split('T')[0], // Fecha
                datos.folio, // ID
                producto.clave, // Clave Producto
                producto.cantidad, // Cantidad
                producto.importe, // Importe (Precio Unitario)
                producto.nombre, // Cliente Nombre
                datos.cliente.codigo, // Cliente Código
                'Cliente Web', // Asesor
                producto.descuento, // Descuento
                producto.precio, // Precio original
                producto.cantidad * producto.precio, // Subtotal sin descuento
                producto.precio * producto.cantidad * (producto.descuento / 100), // Descuento en pesos
                'Sin verificar' // Columna M
            ];
            
            await guardarFilaGoogleSheets(ID_VENTAS, HOJA_VENTAS_PRODUCTOS, datosProducto);
        }
        
        // 2. Guardar en Hoja 2 (Clientes) - Ventas página
        const datosCliente = [
            datos.fecha.toISOString().split('T')[0], // Fecha
            datos.folio, // Folio
            datos.cliente.codigo, // Código Cliente
            datos.cliente.nombre, // Nombre Cliente
            datos.total, // Monto
            datos.tipoPago === 'Crédito' ? datos.saldoPendiente : 0, // Crédito Pendiente
            datos.tipoPago === 'Crédito' ? datos.anticipo : datos.total, // Crédito Liquidado
            'NO', // Factura
            datos.sucursal, // Sucursal
            datos.tipoPago, // Forma Pago
            datos.tipoPago === 'Crédito' ? 'Pago diferido' : 'Pago en una sola exhibición' // Tipo Pago
        ];
        
        await guardarFilaGoogleSheets(ID_VENTAS, HOJA_VENTAS_CLIENTES, datosCliente);
        
        console.log('✅ Venta guardada exitosamente');
        
    } catch (error) {
        console.error('Error al guardar venta:', error);
        throw error;
    }
}

async function guardarFilaGoogleSheets(sheetId, sheetName, datos) {
    // Esta función simula guardar en Google Sheets
    // En producción, usarías Google Apps Script o SheetDB
    
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}`;
    console.log(`📝 Guardando en ${sheetName}:`, datos);
    
    // Simulación - En producción usarías un endpoint real
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ success: true });
        }, 500);
    });
}

// ============================================
// ENVIAR CORREO
// ============================================

async function enviarCorreoVenta(datos) {
    const emailDestino = 'ventas@proconstruccionmx.com';
    
    // Generar HTML del correo
    let htmlProductos = '';
    datos.productos.forEach(p => {
        htmlProductos += `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${p.clave}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${p.nombre}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align:center;">${p.cantidad}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align:right;">${formatoMexicano(p.precio)}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align:center;">${p.descuento}%</td>
                <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align:right;">${formatoMexicano(p.importe)}</td>
            </tr>
        `;
    });
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
            <div style="background: #0A2540; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">ProConstrucción <span style="color: #F5A623;">MX</span></h1>
            </div>
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                <h2 style="color: #0A2540;">🧾 Nueva Compra - ${datos.folio}</h2>
                <p style="color: #4a5568;">Fecha: ${datos.fecha.toLocaleString('es-MX')}</p>
                
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                
                <h3 style="color: #0A2540;">👤 Datos del Cliente</h3>
                <p><strong>Nombre:</strong> ${datos.cliente.nombre}</p>
                <p><strong>Código:</strong> ${datos.cliente.codigo}</p>
                <p><strong>Correo:</strong> ${datos.cliente.correo}</p>
                <p><strong>Teléfono:</strong> ${datos.cliente.telefono || 'No especificado'}</p>
                <p><strong>Giro:</strong> ${datos.cliente.giro || 'No especificado'}</p>
                <p><strong>Sucursal:</strong> ${datos.sucursal}</p>
                <p><strong>Descuento Base:</strong> ${datos.cliente.descuento}%</p>
                
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                
                <h3 style="color: #0A2540;">📦 Productos</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8f9fa;">
                            <th style="padding: 10px; text-align:left;">Clave</th>
                            <th style="padding: 10px; text-align:left;">Producto</th>
                            <th style="padding: 10px; text-align:center;">Cant.</th>
                            <th style="padding: 10px; text-align:right;">Precio</th>
                            <th style="padding: 10px; text-align:center;">Dto.%</th>
                            <th style="padding: 10px; text-align:right;">Importe</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${htmlProductos}
                    </tbody>
                </table>
                
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                
                <div style="text-align: right;">
                    <p><strong>Subtotal:</strong> ${formatoMexicano(datos.subtotal)}</p>
                    <p><strong>IVA (16%):</strong> ${formatoMexicano(datos.iva)}</p>
                    <p style="font-size: 1.4rem; font-weight: 700; color: #0A2540;">
                        <strong>Total:</strong> ${formatoMexicano(datos.total)}
                    </p>
                </div>
                
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                
                <h3 style="color: #0A2540;">💳 Información de Pago</h3>
                <p><strong>Método:</strong> ${datos.tipoPago}</p>
                ${datos.tipoPago === 'Transferencia' ? `
                    <p><strong>Referencia:</strong> ${datos.referencia}</p>
                    <p><strong>Comprobante:</strong> ${datos.comprobanteNombre}</p>
                ` : ''}
                ${datos.tipoPago === 'Crédito' ? `
                    <p><strong>Días de crédito:</strong> ${datos.diasCredito}</p>
                    <p><strong>Anticipo:</strong> ${formatoMexicano(datos.anticipo)}</p>
                    <p><strong>Saldo pendiente:</strong> ${formatoMexicano(datos.saldoPendiente)}</p>
                    <p><strong>Fecha de pago:</strong> ${datos.fechaPago.toLocaleDateString('es-MX')}</p>
                ` : ''}
                
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                
                <p style="text-align: center; color: #718096; font-size: 0.8rem;">
                    Este es un correo automático generado por el sistema de cotización de ProConstrucción MX.
                </p>
            </div>
        </body>
        </html>
    `;
    
    // Simular envío de correo
    console.log('📧 Enviando correo a:', emailDestino);
    console.log('📝 Contenido del correo:', html);
    
    // En producción usarías EmailJS o un servicio de correo
    // Por ahora lo simulamos
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ success: true });
        }, 500);
    });
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
    
    // Generar número secuencial (simulado)
    const numero = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
    return prefijo + numero;
}

function mostrarNotificacion(mensaje) {
    // Crear notificación simple
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
