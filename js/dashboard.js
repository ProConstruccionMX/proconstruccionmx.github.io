<div id="formCredito" style="display:none;">
    <!-- ⭐ SELECCIÓN DE FACTURA EN CRÉDITO ⭐ -->
    <div class="form-group">
        <label>¿Deseas factura? <span style="color:red;">*</span></label>
        <div class="factura-toggle" id="facturaToggleCredito">
            <button class="selected" onclick="seleccionarFacturaCredito('no')" id="facturaNoCredito">No</button>
            <button onclick="seleccionarFacturaCredito('si')" id="facturaSiCredito">Sí</button>
        </div>
    </div>

    <!-- SELECCIÓN DE RAZÓN SOCIAL (solo si factura = Sí) -->
    <div id="facturaRazonSocialContainerCredito" style="display:none;">
        <div class="form-group">
            <label>Selecciona la razón social para facturar <span style="color:red;">*</span></label>
            <select id="facturaRazonSocialSelectCredito" onchange="cargarDatosFacturaSeleccionadosCredito()">
                <option value="">-- Selecciona una razón social --</option>
            </select>
        </div>
        <!-- ⭐ BOTÓN PARA AGREGAR NUEVA RAZÓN SOCIAL ⭐ -->
        <div style="margin-bottom: 1rem; text-align: center;">
            <button type="button" class="btn-secondary" onclick="abrirModalAgregarFacturacionDesdePago()" style="padding:0.5rem 1.5rem; font-size:0.85rem;">
                <i class="fas fa-plus"></i> Registrar nueva razón social
            </button>
        </div>
        <div id="facturaDatosPreviewCredito" style="display:none; background:var(--gray-light); padding:1rem; border-radius:12px; margin-bottom:1rem;">
            <p><strong>RFC:</strong> <span id="facturaPreviewRFCCredito">---</span></p>
            <p><strong>Uso de CFDI:</strong> <span id="facturaPreviewUsoCredito">---</span></p>
            <p><strong>C.P.:</strong> <span id="facturaPreviewCPCredito">---</span></p>
            <p><strong>Régimen Fiscal:</strong> <span id="facturaPreviewRegimenCredito">---</span></p>
            <p><strong>Correo:</strong> <span id="facturaPreviewCorreoCredito">---</span></p>
        </div>
    </div>

    <div class="form-group">
        <label>Días de crédito: <strong>20 días fijos</strong></label>
        <p style="font-size:0.9rem;color:var(--text-gray);">El crédito es por 20 días. Si no se cumple con el pago, se podrá eliminar el crédito.</p>
        <input type="hidden" id="diasCredito" value="20">
    </div>
    <div class="form-group">
        <label>Total a pagar: <strong id="totalCredito">$0.00</strong></label>
    </div>
    <button class="btn-enviar" onclick="procesarPagoCredito()">
        <i class="fas fa-check"></i> Confirmar Crédito
    </button>
</div>
