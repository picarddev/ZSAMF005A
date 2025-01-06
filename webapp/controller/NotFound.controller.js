sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/ui/core/UIComponent"
], function (Controller, History, UIComponent) {
	"use strict";

	return Controller.extend("ZSAMF005A.ZSAMF005A.controller.NotFound", {

		onInit: function () {
			var oRouter, oTarget;
			
			oRouter = this.getRouter();
			oTarget = oRouter.getTarget("notFound");
			oTarget.attachDisplay(function (oEvent) {
				this._oData = oEvent.getParameter("data"); // store the data
			}, this);
		},

		/**
		 * Return the router
		 */
		getRouter: function () {
			return UIComponent.getRouterFor(this);
		},

		/**
		 * Navigate to the previous view
		 */
		onNavBack: function () {
			// in some cases we could display a certain target when the back button is pressed
			if (this._oData && this._oData.fromTarget) {
				this.getRouter().getTargets().display(this._oData.fromTarget);
				delete this._oData.fromTarget;
				return;
			}

			var oHistory, sPreviousHash;

			oHistory = History.getInstance();
			sPreviousHash = oHistory.getPreviousHash();

			if (sPreviousHash !== undefined) {
				window.history.go(-1);
			} else {
				this.getRouter().navTo("RouteOrdersList", {}, true /*no history*/ );
			}
		}

	});

});