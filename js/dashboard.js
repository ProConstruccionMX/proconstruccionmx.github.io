<!-- ===== MODAL DE AGREGAR FACTURACIÓN (DESDE PESTAÑA) ===== -->
<div class="modal-overlay" id="modalAgregarFacturacion">
    <div class="modal">
        <h2>📄 Agregar Datos de Facturación</h2>
        <p class="subtitle">Registra una nueva razón social para tus facturas</p>

        <div id="modalAgregarFactMensaje" style="display:none;"></div>

        <div class="form-group">
            <label>Nombre del cliente</label>
            <input type="text" id="agregarFactNombre" readonly style="background:#f0f0f0;">
        </div>
        <div class="form-group">
            <label>Razón Social <span style="color:red;">*</span></label>
            <input type="text" id="agregarFactRazonSocial" placeholder="Ej: ProConstrucción MX SAS DE CV">
        </div>
        <div class="form-group">
            <label>RFC <span style="color:red;">*</span></label>
            <input type="text" id="agregarFactRFC" placeholder="Ej: PRO2605135X4">
        </div>
        <div class="form-group">
            <label>Uso de CFDI <span style="color:red;">*</span></label>
            <input type="text" id="agregarFactUsoCFDI" placeholder="Ej: G03 - Gastos en general">
        </div>
        <div class="form-group">
            <label>Código Postal <span style="color:red;">*</span></label>
            <input type="text" id="agregarFactCP" placeholder="Ej: 03100">
        </div>
        <div class="form-group">
            <label>Régimen Fiscal <span style="color:red;">*</span></label>
            <input type="text" id="agregarFactRegimen" placeholder="Ej: 601 - General de Ley Personas Morales">
        </div>
        <div class="form-group">
            <label>Correo <span style="color:red;">*</span></label>
            <input type="email" id="agregarFactCorreo" placeholder="Ej: facturacion@empresa.com">
        </div>

        <button class="btn-enviar" onclick="guardarNuevaFacturacion()">
            <i class="fas fa-save"></i> Guardar
        </button>
        <button class="btn-cerrar-modal" onclick="cerrarModalAgregarFacturacion()">
            <i class="fas fa-times"></i> Cancelar
        </button>
    </div>
</div>

<!-- ===== MODAL DE AGREGAR FACTURACIÓN (DESDE PAGO) ===== -->
<div class="modal-overlay" id="modalAgregarFacturacionPago">
    <div class="modal">
        <h2>📄 Registrar nueva razón social</h2>
        <p class="subtitle">Agrega una nueva opción de facturación</p>

        <div id="modalAgregarFactPagoMensaje" style="display:none;"></div>

        <div class="form-group">
            <label>Nombre del cliente</label>
            <input type="text" id="agregarFactPagoNombre" readonly style="background:#f0f0f0;">
        </div>
        <div class="form-group">
            <label>Razón Social <span style="color:red;">*</span></label>
            <input type="text" id="agregarFactPagoRazonSocial" placeholder="Ej: ProConstrucción MX SAS DE CV">
        </div>
        <div class="form-group">
            <label>RFC <span style="color:red;">*</span></label>
            <input type="text" id="agregarFactPagoRFC" placeholder="Ej: PRO2605135X4">
        </div>
        <div class="form-group">
            <label>Uso de CFDI <span style="color:red;">*</span></label>
            <input type="text" id="agregarFactPagoUsoCFDI" placeholder="Ej: G03 - Gastos en general">
        </div>
        <div class="form-group">
            <label>Código Postal <span style="color:red;">*</span></label>
            <input type="text" id="agregarFactPagoCP" placeholder="Ej: 03100">
        </div>
        <div class="form-group">
            <label>Régimen Fiscal <span style="color:red;">*</span></label>
            <input type="text" id="agregarFactPagoRegimen" placeholder="Ej: 601 - General de Ley Personas Morales">
        </div>
        <div class="form-group">
            <label>Correo <span style="color:red;">*</span></label>
            <input type="email" id="agregarFactPagoCorreo" placeholder="Ej: facturacion@empresa.com">
        </div>

        <button class="btn-enviar" onclick="guardarNuevaFacturacionDesdePago()">
            <i class="fas fa-save"></i> Guardar
        </button>
        <button class="btn-cerrar-modal" onclick="cerrarModalAgregarFacturacionPago()">
            <i class="fas fa-times"></i> Cancelar
        </button>
    </div>
</div>
