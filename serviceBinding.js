function initModel() {
	var sUrl = "/sap/opu/odata/sap/ZSAMF005A_PRPOSITION_CMD_SRV/";
	var oModel = new sap.ui.model.odata.ODataModel(sUrl, true);
	sap.ui.getCore().setModel(oModel);
}