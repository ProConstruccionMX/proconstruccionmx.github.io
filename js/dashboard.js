// ============================================
// APPS SCRIPT COMPLETO - PROCONSTRUCCIÓN MX
// ============================================

function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);
        const action = data.action;
        
        console.log('📥 Acción recibida:', action);
        console.log('📥 Datos:', data);
        
        // ============================================
        // ACCIONES EXISTENTES
        // ============================================
        
        if (action === 'guardarFila') {
            return guardarFila(data);
        }
        
        if (action === 'agregar') {
            return agregarDireccion(data);
        }
        
        if (action === 'actualizar') {
            return actualizarDireccion(data);
        }
        
        if (action === 'eliminar') {
            return eliminarDireccion(data);
        }
        
        if (action === 'actualizarFacturacion') {
            return actualizarFacturacion(data);
        }
        
        if (action === 'agregarFacturacion') {
            return agregarFacturacion(data);
        }
        
        if (action === 'eliminarFacturacion') {
            return eliminarFacturacion(data);
        }
        
        if (action === 'enviarCorreoAdjunto') {
            return enviarCorreoAdjunto(data);
        }
        
        // ============================================
        // ⭐ NUEVAS ACCIONES PARA PAGO DE CRÉDITO
        // ============================================
        
        if (action === 'marcarColumnaPCliente') {
            return marcarColumnaPCliente(data);
        }
        
        if (action === 'enviarCorreoPagoCreditoBonito') {
            return enviarCorreoPagoCreditoBonito(data);
        }
        
        // ============================================
        // ACCIONES PARA ACTUALIZAR CRÉDITO (opcionales)
        // ============================================
        
        if (action === 'actualizarPagoCreditoProductos') {
            return actualizarPagoCreditoProductos(data);
        }
        
        if (action === 'actualizarPagoCreditoClientes') {
            return actualizarPagoCreditoClientes(data);
        }
        
        return ContentService
            .createTextOutput(JSON.stringify({ success: false, error: 'Acción no reconocida: ' + action }))
            .setMimeType(ContentService.MimeType.JSON);
            
    } catch (error) {
        console.error('❌ Error en doPost:', error);
        return ContentService
            .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// ============================================
// FUNCIONES PARA GUARDAR FILAS EN SHEETS
// ============================================

function guardarFila(data) {
    try {
        const sheetName = data.sheetName;
        const datos = data.datos;
        
        const spreadsheetId = '1jCvEvZ2aBF2nRhE_Jsw_S_8yDFYZgaWwIUNu9pNNKGc';
        const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
        
        if (!sheet) {
            return ContentService
                .createTextOutput(JSON.stringify({ success: false, error: 'Hoja no encontrada: ' + sheetName }))
                .setMimeType(ContentService.MimeType.JSON);
        }
        
        sheet.appendRow(datos);
        
        console.log('✅ Fila guardada en:', sheetName);
        
        return ContentService
            .createTextOutput(JSON.stringify({ success: true }))
            .setMimeType(ContentService.MimeType.JSON);
            
    } catch (error) {
        console.error('❌ Error en guardarFila:', error);
        return ContentService
            .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// ============================================
// FUNCIONES PARA DIRECCIONES
// ============================================

function agregarDireccion(data) {
    try {
        const spreadsheetId = '1yCQ-cJJ7PALDYSwIcpsj1ZfACtNLJwfOR7HY-mPzgx4';
        const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Direcciones');
        
        if (!sheet) {
            return ContentService
                .createTextOutput(JSON.stringify({ success: false, error: 'Hoja Direcciones no encontrada' }))
                .setMimeType(ContentService.MimeType.JSON);
        }
        
        sheet.appendRow([
            data.codigo,
            data.nombre,
            data.calle,
            data.colonia,
            data.alcaldia,
            data.estado,
            data.cp,
            data.mapsUrl || '',
            data.telefono,
            data.nombreRecibe
        ]);
        
        console.log('✅ Dirección agregada para:', data.codigo);
        
        return ContentService
            .createTextOutput(JSON.stringify({ success: true }))
            .setMimeType(ContentService.MimeType.JSON);
            
    } catch (error) {
        console.error('❌ Error en agregarDireccion:', error);
        return ContentService
            .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

function actualizarDireccion(data) {
    try {
        const spreadsheetId = '1yCQ-cJJ7PALDYSwIcpsj1ZfACtNLJwfOR7HY-mPzgx4';
        const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Direcciones');
        
        if (!sheet) {
            return ContentService
                .createTextOutput(JSON.stringify({ success: false, error: 'Hoja Direcciones no encontrada' }))
                .setMimeType(ContentService.MimeType.JSON);
        }
        
        const fila = data.fila;
        
        sheet.getRange(fila, 2).setValue(data.nombre);
        sheet.getRange(fila, 3).setValue(data.calle);
        sheet.getRange(fila, 4).setValue(data.colonia);
        sheet.getRange(fila, 5).setValue(data.alcaldia);
        sheet.getRange(fila, 6).setValue(data.estado);
        sheet.getRange(fila, 7).setValue(data.cp);
        sheet.getRange(fila, 8).setValue(data.mapsUrl || '');
        sheet.getRange(fila, 9).setValue(data.telefono);
        sheet.getRange(fila, 10).setValue(data.nombreRecibe);
        
        console.log('✅ Dirección actualizada - Fila:', fila);
        
        return ContentService
            .createTextOutput(JSON.stringify({ success: true }))
            .setMimeType(ContentService.MimeType.JSON);
            
    } catch (error) {
        console.error('❌ Error en actualizarDireccion:', error);
        return ContentService
            .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

function eliminarDireccion(data) {
    try {
        const spreadsheetId = '1yCQ-cJJ7PALDYSwIcpsj1ZfACtNLJwfOR7HY-mPzgx4';
        const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Direcciones');
        
        if (!sheet) {
            return ContentService
                .createTextOutput(JSON.stringify({ success: false, error: 'Hoja Direcciones no encontrada' }))
                .setMimeType(ContentService.MimeType.JSON);
        }
        
        const fila = data.fila;
        sheet.deleteRow(fila);
        
        console.log('✅ Dirección eliminada - Fila:', fila);
        
        return ContentService
            .createTextOutput(JSON.stringify({ success: true }))
            .setMimeType(ContentService.MimeType.JSON);
            
    } catch (error) {
        console.error('❌ Error en eliminarDireccion:', error);
        return ContentService
            .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// ============================================
// FUNCIONES PARA FACTURACIÓN
// ============================================

function actualizarFacturacion(data) {
    try {
        const spreadsheetId = '1kGtq_MQye-GnvcbxNSA1o_gx6MCKkjwFcEKWEQdrX_g';
        const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Facturacion');
        
        if (!sheet) {
            return ContentService
                .createTextOutput(JSON.stringify({ success: false, error: 'Hoja Facturacion no encontrada' }))
                .setMimeType(ContentService.MimeType.JSON);
        }
        
        const fila = data.fila;
        
        sheet.getRange(fila, 3).setValue(data.razonSocial);
        sheet.getRange(fila, 4).setValue(data.rfc);
        sheet.getRange(fila, 5).setValue(data.usoCFDI);
        sheet.getRange(fila, 6).setValue(data.cp);
        sheet.getRange(fila, 7).setValue(data.regimen);
        sheet.getRange(fila, 8).setValue(data.correo);
        
        console.log('✅ Facturación actualizada - Fila:', fila);
        
        return ContentService
            .createTextOutput(JSON.stringify({ success: true }))
            .setMimeType(ContentService.MimeType.JSON);
            
    } catch (error) {
        console.error('❌ Error en actualizarFacturacion:', error);
        return ContentService
            .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

function agregarFacturacion(data) {
    try {
        const spreadsheetId = '1kGtq_MQye-GnvcbxNSA1o_gx6MCKkjwFcEKWEQdrX_g';
        const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Facturacion');
        
        if (!sheet) {
            return ContentService
                .createTextOutput(JSON.stringify({ success: false, error: 'Hoja Facturacion no encontrada' }))
                .setMimeType(ContentService.MimeType.JSON);
        }
        
        sheet.appendRow([
            data.codigo,
            data.nombre,
            data.razonSocial,
            data.rfc,
            data.usoCFDI,
            data.cp,
            data.regimen,
            data.correo
        ]);
        
        console.log('✅ Facturación agregada para:', data.codigo);
        
        return ContentService
            .createTextOutput(JSON.stringify({ success: true }))
            .setMimeType(ContentService.MimeType.JSON);
            
    } catch (error) {
        console.error('❌ Error en agregarFacturacion:', error);
        return ContentService
            .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

function eliminarFacturacion(data) {
    try {
        const spreadsheetId = '1kGtq_MQye-GnvcbxNSA1o_gx6MCKkjwFcEKWEQdrX_g';
        const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Facturacion');
        
        if (!sheet) {
            return ContentService
                .createTextOutput(JSON.stringify({ success: false, error: 'Hoja Facturacion no encontrada' }))
                .setMimeType(ContentService.MimeType.JSON);
        }
        
        const fila = data.fila;
        sheet.deleteRow(fila);
        
        console.log('✅ Facturación eliminada - Fila:', fila);
        
        return ContentService
            .createTextOutput(JSON.stringify({ success: true }))
            .setMimeType(ContentService.MimeType.JSON);
            
    } catch (error) {
        console.error('❌ Error en eliminarFacturacion:', error);
        return ContentService
            .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// ============================================
// ⭐ FUNCIÓN: MARCAR COLUMNA P EN CLIENTES
// ============================================

function marcarColumnaPCliente(data) {
    try {
        const spreadsheetId = '1jCvEvZ2aBF2nRhE_Jsw_S_8yDFYZgaWwIUNu9pNNKGc';
        const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Clientes');
        
        if (!sheet) {
            return ContentService
                .createTextOutput(JSON.stringify({ success: false, error: 'Hoja Clientes no encontrada' }))
                .setMimeType(ContentService.MimeType.JSON);
        }
        
        const fila = data.fila;
        const valor = data.valor || 'SI';
        
        console.log('📝 Marcando columna P - Fila:', fila, 'Valor:', valor);
        
        // Columna P (índice 16)
        sheet.getRange(fila, 16).setValue(valor);
        
        return ContentService
            .createTextOutput(JSON.stringify({ success: true, fila: fila }))
            .setMimeType(ContentService.MimeType.JSON);
            
    } catch (error) {
        console.error('❌ Error en marcarColumnaPCliente:', error);
        return ContentService
            .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// ============================================
// ⭐ FUNCIÓN: ENVIAR CORREO PAGO CREDITO BONITO (SIN EMOJIS)
// ============================================

function enviarCorreoPagoCreditoBonito(data) {
    try {
        const email = data.email || 'ventas@proconstruccionmx.com';
        const asunto = data.asunto || 'PAGO DE CREDITO';
        const htmlContent = data.htmlContent || '';
        const textoPlano = data.textoPlano || '';
        const comprobanteBase64 = data.comprobanteBase64 || null;
        const comprobanteNombre = data.comprobanteNombre || 'comprobante.jpg';
        const comprobanteTipo = data.comprobanteTipo || 'image/jpeg';
        
        console.log('📧 Enviando correo PAGO DE CREDITO a:', email);
        console.log('📧 Asunto:', asunto);
        console.log('📧 Comprobante:', comprobanteNombre);
        
        let attachments = [];
        
        if (comprobanteBase64) {
            const blob = Utilities.newBlob(
                Utilities.base64Decode(comprobanteBase64),
                comprobanteTipo,
                comprobanteNombre
            );
            attachments.push(blob);
            console.log('✅ Comprobante adjuntado');
        }
        
        GmailApp.sendEmail(email, asunto, textoPlano, {
            htmlBody: htmlContent,
            attachments: attachments
        });
        
        console.log('✅ Correo enviado exitosamente');
        
        return ContentService
            .createTextOutput(JSON.stringify({ success: true }))
            .setMimeType(ContentService.MimeType.JSON);
            
    } catch (error) {
        console.error('❌ Error en enviarCorreoPagoCreditoBonito:', error);
        return ContentService
            .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// ============================================
// ⭐ FUNCIÓN: ENVIAR CORREO CON ADJUNTO (VENTAS)
// ============================================

function enviarCorreoAdjunto(data) {
    try {
        const email = data.email || 'ventas@proconstruccionmx.com';
        const asunto = data.asunto || 'NUEVA VENTA WEB';
        const comprobanteBase64 = data.comprobanteBase64 || null;
        const comprobanteNombre = data.comprobanteNombre || 'comprobante.jpg';
        const comprobanteTipo = data.comprobanteTipo || 'image/jpeg';
        
        // Construir cuerpo del correo
        let cuerpo = '';
        cuerpo += 'NUEVA VENTA WEB\n';
        cuerpo += '==================\n\n';
        cuerpo += 'Folio: ' + (data.folio || 'Sin folio') + '\n';
        cuerpo += 'Fecha: ' + (data.fecha || new Date().toLocaleString('es-MX')) + '\n';
        cuerpo += 'Cliente: ' + (data.cliente_nombre || 'Sin nombre') + '\n';
        cuerpo += 'Tipo de pago: ' + (data.tipo_pago || 'No especificado') + '\n';
        cuerpo += 'Referencia: ' + (data.referencia || 'N/A') + '\n\n';
        
        cuerpo += 'PRODUCTOS:\n';
        cuerpo += data.productos_texto || 'No hay productos' + '\n\n';
        
        cuerpo += 'TOTALES:\n';
        cuerpo += 'Subtotal: $' + (data.subtotal || '0.00') + '\n';
        cuerpo += 'IVA (16%): $' + (data.iva || '0.00') + '\n';
        cuerpo += 'Total: $' + (data.total || '0.00') + '\n\n';
        
        if (data.direccion_nombre) {
            cuerpo += 'DIRECCION DE ENVIO:\n';
            cuerpo += 'Nombre: ' + (data.direccion_nombre || 'Sin nombre') + '\n';
            cuerpo += 'Calle: ' + (data.direccion_calle || '') + '\n';
            cuerpo += 'Colonia: ' + (data.direccion_colonia || '') + '\n';
            cuerpo += 'Alcaldia: ' + (data.direccion_alcaldia || '') + '\n';
            cuerpo += 'Estado: ' + (data.direccion_estado || '') + '\n';
            cuerpo += 'CP: ' + (data.direccion_cp || '') + '\n';
            cuerpo += 'Telefono: ' + (data.direccion_telefono || '') + '\n';
            cuerpo += 'Recibe: ' + (data.direccion_recibe || '') + '\n\n';
        }
        
        if (data.requiere_factura) {
            cuerpo += 'FACTURA SOLICITADA:\n';
            cuerpo += 'Razon Social: ' + (data.factura_razon_social || '') + '\n';
            cuerpo += 'RFC: ' + (data.factura_rfc || '') + '\n\n';
        }
        
        cuerpo += '---\n';
        cuerpo += 'ProConstruccion MX\n';
        cuerpo += 'ventas@proconstruccionmx.com\n';
        
        let attachments = [];
        
        if (comprobanteBase64) {
            const blob = Utilities.newBlob(
                Utilities.base64Decode(comprobanteBase64),
                comprobanteTipo,
                comprobanteNombre
            );
            attachments.push(blob);
        }
        
        GmailApp.sendEmail(email, asunto, cuerpo, {
            attachments: attachments
        });
        
        console.log('✅ Correo de venta enviado a:', email);
        
        return ContentService
            .createTextOutput(JSON.stringify({ success: true }))
            .setMimeType(ContentService.MimeType.JSON);
            
    } catch (error) {
        console.error('❌ Error en enviarCorreoAdjunto:', error);
        return ContentService
            .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// ============================================
// ⭐ FUNCIONES PARA ACTUALIZAR CRÉDITO (opcionales)
// ============================================

function actualizarPagoCreditoProductos(data) {
    try {
        const spreadsheetId = '1jCvEvZ2aBF2nRhE_Jsw_S_8yDFYZgaWwIUNu9pNNKGc';
        const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Productos');
        
        if (!sheet) {
            return ContentService
                .createTextOutput(JSON.stringify({ success: false, error: 'Hoja Productos no encontrada' }))
                .setMimeType(ContentService.MimeType.JSON);
        }
        
        const fila = data.fila;
        const creditoPendiente = data.creditoPendiente;
        const montoPagado = data.montoPagado;
        
        console.log('📝 Actualizando Productos - Fila:', fila);
        console.log('📝 Credito pendiente:', creditoPendiente);
        console.log('📝 Monto pagado:', montoPagado);
        
        // Columna H (índice 8) = Crédito pendiente
        sheet.getRange(fila, 8).setValue(creditoPendiente);
        // Columna I (índice 9) = Monto pagado
        sheet.getRange(fila, 9).setValue(montoPagado);
        
        return ContentService
            .createTextOutput(JSON.stringify({ success: true, fila: fila }))
            .setMimeType(ContentService.MimeType.JSON);
            
    } catch (error) {
        console.error('❌ Error en actualizarPagoCreditoProductos:', error);
        return ContentService
            .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

function actualizarPagoCreditoClientes(data) {
    try {
        const spreadsheetId = '1jCvEvZ2aBF2nRhE_Jsw_S_8yDFYZgaWwIUNu9pNNKGc';
        const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Clientes');
        
        if (!sheet) {
            return ContentService
                .createTextOutput(JSON.stringify({ success: false, error: 'Hoja Clientes no encontrada' }))
                .setMimeType(ContentService.MimeType.JSON);
        }
        
        const fila = data.fila;
        const creditoPendiente = data.creditoPendiente;
        const montoPagado = data.montoPagado;
        
        console.log('📝 Actualizando Clientes - Fila:', fila);
        console.log('📝 Credito pendiente:', creditoPendiente);
        console.log('📝 Monto pagado:', montoPagado);
        
        // Columna F (índice 6) = Crédito pendiente
        sheet.getRange(fila, 6).setValue(creditoPendiente);
        // Columna G (índice 7) = Monto pagado
        sheet.getRange(fila, 7).setValue(montoPagado);
        
        return ContentService
            .createTextOutput(JSON.stringify({ success: true, fila: fila }))
            .setMimeType(ContentService.MimeType.JSON);
            
    } catch (error) {
        console.error('❌ Error en actualizarPagoCreditoClientes:', error);
        return ContentService
            .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// ============================================
// FUNCIÓN PARA OBTENER DATOS DE FACTURACIÓN (GET)
// ============================================

function doGet(e) {
    try {
        const spreadsheetId = '1kGtq_MQye-GnvcbxNSA1o_gx6MCKkjwFcEKWEQdrX_g';
        const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Facturacion');
        
        if (!sheet) {
            return ContentService
                .createTextOutput(JSON.stringify({ success: false, error: 'Hoja Facturacion no encontrada' }))
                .setMimeType(ContentService.MimeType.JSON);
        }
        
        const data = sheet.getDataRange().getValues();
        const headers = data[0];
        const rows = [];
        
        for (let i = 1; i < data.length; i++) {
            const row = {};
            for (let j = 0; j < headers.length; j++) {
                row[headers[j]] = data[i][j];
            }
            rows.push(row);
        }
        
        return ContentService
            .createTextOutput(JSON.stringify({ success: true, data: rows }))
            .setMimeType(ContentService.MimeType.JSON);
            
    } catch (error) {
        console.error('❌ Error en doGet:', error);
        return ContentService
            .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}
