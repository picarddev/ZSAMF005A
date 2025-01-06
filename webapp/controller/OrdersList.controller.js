sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/Fragment",
	"ZSAMF005A/ZSAMF005A/model/formatter"
], function (Controller, Fragment, formatter) {
	"use strict";

	return Controller.extend("ZSAMF005A.ZSAMF005A.controller.OrdersList", {
		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */
		/**
		 * Called when the OrdersList controller is instantiated.
		 * 
		 * @public
		 */
		onInit: function () {
			// Reload Table on nav back
			this._bReload = false;

			// Keeps reference to any of the created sap.m.ViewSettingsDialog-s
			this._mViewSettingsDialogs = {};

			// Set Route Matched event to fetch the Order's data
			var oRouter = this.getOwnerComponent().getRouter();
			oRouter.getRoute("RouteOrdersList").attachMatched(this._onRouteMatched, this);

			// Set Analytics Model in the view
			this.getView().setModel(new sap.ui.model.json.JSONModel({}), "analyticsModel");
		},

		/* =========================================================== */
		/* Business logic                                              */
		/* =========================================================== */
		/**
		 * Get the HeaderCmd Data
		 * and calculate the Analyitcs such as:
		 * - Autorised Rolls
		 * - Nb of rolls today
		 * - Nb of cartons today
		 * - Total value today
		 * 
		 * @public
		 */
		calculateAnalytics: function () {
			// Analytics data
			var iCartonsToday = 0,
				iRollsToday = 0,
				iTotalValueToday = 0;
			// Get the binding for the items in the table
			var oBinding = this.byId("idOrdersTable").getBinding("items");

			oBinding.getContexts().forEach(function (oItem) {
				var oHeader = oItem.getObject();

				// Check if delivery date is today
				if (this._isToday(oHeader.Eindt)) {
					iCartonsToday += oHeader.Zqtecar;
					iRollsToday += oHeader.Zqteroll;
					iTotalValueToday += parseFloat(oHeader.Zzvaleur);
				}
			}.bind(this));

			// Set Analytics Model data 
			this.getView().getModel("analyticsModel").setData({
				cartonsToday: iCartonsToday,
				rollsToday: iRollsToday,
				totalValueToday: iTotalValueToday.toFixed(2)
			}, true);
		},

		/**
		 * Helper function to check if a date is today
		 */
		_isToday: function (date) {
			if (!date) return false;

			var today = new Date();

			return (
				date.getDate() === today.getDate() &&
				date.getMonth() === today.getMonth() &&
				date.getFullYear() === today.getFullYear()
			);
		},

		/**
		 * Create view settings dialog and add it to view
		 */
		getViewSettingsDialog: function (sDialogFragmentName) {
			var oView = this.getView(),
				pDialog = this._mViewSettingsDialogs[sDialogFragmentName];

			if (!pDialog) {
				pDialog = Fragment.load({
					id: this.getView().getId(),
					name: sDialogFragmentName,
					controller: this
				}).then(function (oDialog) {
					if (sap.ui.Device.system.desktop) {
						oDialog.addStyleClass("sapUiSizeCompact");
					}

					oView.addDependent(oDialog);

					return oDialog;
				});
				this._mViewSettingsDialogs[sDialogFragmentName] = pDialog;
			}

			return pDialog;
		},

		/**
		 * Handle table sort button press
		 */
		handleSortButtonPressed: function () {
			this.getViewSettingsDialog("ZSAMF005A.ZSAMF005A.view.fragment.OrdersSortDialog")
				.then(function (oViewSettingsDialog) {
					oViewSettingsDialog.open();
				});
		},

		/**
		 * Sort table after dialog confirmation
		 */
		handleSortDialogConfirm: function (oEvent) {
			var oTable = this.byId("idOrdersTable"),
				mParams = oEvent.getParameters(),
				oBinding = oTable.getBinding("items"),
				sPath,
				bDescending,
				aSorters = [];

			sPath = mParams.sortItem.getKey();
			bDescending = mParams.sortDescending;
			aSorters.push(new sap.ui.model.Sorter(sPath, bDescending));

			// Apply the selected sort and group settings
			oBinding.sort(aSorters);
		},

		/**
		 * Event handle for Navigating to Order Details
		 */
		onPressCmdNav: function (oEvent) {
			// Get the selected Item
			var oSelectedItem = oEvent.getSource(),
				oBindingContext = oSelectedItem.getBindingContext(),
				oItemData = oBindingContext.getObject();

			// Get the router instance from the component
			var oRouter = this.getOwnerComponent().getRouter();
			// Navigate to Details Page
			oRouter.navTo("RouteOrderDetails", {
				orderNumber: oItemData.Ebeln
			}, false);
		},
		
		/**
 		 * Navigates back in the browser history, if the entry was created by this app.
 		 * If not, it navigates to the Fiori Launchpad home page.
 		 * 
 		 * @public
 		 */
 		onNavBack: function () {
 			var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

 			// Navigate back to FLP home
 			oCrossAppNavigator.toExternal({
 				target: {
 					shellHash: "#Shell-home"
 				}
 			});
 		},

		/**
		 * Route Matched Event on OrderList View
		 */
		_onRouteMatched: function (oEvent) {
			var oArgs = oEvent.getParameter("arguments"),
				oView = this.getView(),
				oModel = oView.getModel();

			// Request the data for DivisionSet
			oModel.read("/DivisionSet", {
				success: function (oData) {
					// Get the first item from the array
					var oFirstDivision = oData.results[0];

					// Set the first item as a new object in the model's data
					this.getView().getModel("analyticsModel").setData({
						authorizedRolls: oFirstDivision.RollAutorise,
						totalValueTodayUnit: oFirstDivision.Waers
					}, true);

				}.bind(this),
				error: function (oError) {
					// Handle error if necessary
					console.error("Error while fetching data from DivisionSet: ", oError);
				}
			});

			if (this._bReload) {
				// Refresh the table
				this.byId("idOrdersTable").getBinding("items").refresh(true);
			} else {
				this._bReload = true;
			}
		},
	});
});