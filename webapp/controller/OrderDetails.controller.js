sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/odata/v2/ODataModel",
	"sap/ui/core/Fragment",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"ZSAMF005A/ZSAMF005A/model/formatter"
], function (Controller, JSONModel, ODataModel, Fragment, MessageBox, MessageToast, formatter) {
	"use strict";

	return Controller.extend("ZSAMF005A.ZSAMF005A.controller.OrderDetails", {
		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */
		/**
		 * Called when the OrderDetails controller is instantiated.
		 * 
		 * @public
		 */
		onInit: function () {
			window.addEventListener('beforeunload', function (event) {
			  event.preventDefault();
			  return (event.returnValue = "");
			});
			
			// Get the service URL from the model defined in the manifest
			var oOwner = this.getOwnerComponent(),
				oModel = oOwner.getModel(),
				oView = this.getView();

			// Keeps reference to any of the created sap.m.ViewSettingsDialog-s
			this._mViewSettingsDialogs = {};

			// Keeps reference to any of the created sap.m.Dialog
			this._oDialog = {};
			this._oDialogX = {};

			// Array to handle Post quatity updates
			this._aUpdateQueue = [];

			// Get MessageManager
			this._oMessageManager = sap.ui.getCore().getMessageManager();
			// Set i18N Resource Bundle
			this._oResourceBundle = oOwner.getModel("i18n").getResourceBundle();

			// Set Route Matched event to fetch the Order's data
			var oRouter = oOwner.getRouter();
			oRouter.getRoute("RouteOrderDetails").attachMatched(this._onRouteMatched, this);

			// Create and set the model for "headerCmdSet"
			this._oHeaderModel = new ODataModel({
				serviceUrl: oModel.sServiceUrl,
				defaultBindingMode: "OneWay",
				useBatch: false
			});
			oView.setModel(this._oHeaderModel, "headerModel");

			// Create and set the model for "itemCmdSet"
			this._oItemsModel = new ODataModel({
				serviceUrl: oModel.sServiceUrl,
				defaultBindingMode: "TwoWay",
				refreshAfterChange: false,
				useBatch: false,
				defaultCountMode: "Inline"
			});
			oView.setModel(this._oItemsModel, "itemsModel");

			// Create and set the model for "activeRange"
			oView.setModel(new JSONModel(), "activeRangeModel");

			// Order's IconTabBar
			this._oIconTabBar = oView.byId("idOrderIconTabBar");
			// Order's Items Table
			this._oOrderItems = oView.byId("idItemsTable");
			this._oOrderItemsTemplate = this.byId('idItemsColumnListItem').clone();

			// Array of Items Keys used for occurence check
			this._orderItemsKeys = [];
			// Array of searched items in the products dialog
			this._aSearchedItems = [];

			// Create and set the model for "orderDetailsView"
			oView.setModel(new JSONModel({
				busy: false,
				selectedTab: "orderItems"
			}), "viewModel");
			
			// Init sort & filter ViewSettingsDialog
			this._initViewSettingDialog();
		},

		/* =========================================================== */
		/* Business logic                                              */
		/* =========================================================== */
		/**
		 * Create view settings dialog and add it to view
		 * 
		 * @public
		 */
		getViewSettingsDialog: function (sDialogFragmentName) {
			var oView = this.getView(),
				pDialog = this._mViewSettingsDialogs[sDialogFragmentName];

			if (!pDialog) {
				pDialog = Fragment.load({
					id: oView.getId(),
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
		 * 
		 * @public
		 */
		handleSortButtonPressed: function () {
			this.getViewSettingsDialog("ZSAMF005A.ZSAMF005A.view.fragment.ItemsSortDialog")
				.then(function (oViewSettingsDialog) {
					oViewSettingsDialog.open();
				});
		},

		/**
		 * Sort table after dialog confirmation
		 * 
		 * @public
		 */
		handleSortDialogConfirm: function (oEvent) {
			var mParams = oEvent.getParameters(),
				oBinding = this._oOrderItems.getBinding("items"),
				sPath = mParams.sortItem.getKey(),
				bDescending = mParams.sortDescending,
				aSorters = [];

			// Add sorter to the sorters' array
			if(sPath === "ActivityId") {
				aSorters.push(
					new sap.ui.model.Sorter("ActivityId", false),
					new sap.ui.model.Sorter("FamilyId", false),
					new sap.ui.model.Sorter("SubFamilyId", false),
					new sap.ui.model.Sorter("Matnr", false)
				);
			} else {
				aSorters.push(new sap.ui.model.Sorter(sPath, bDescending));
			}

			// Apply the selected sort and group settings
			oBinding.sort(aSorters);
		},

		/**
		 * Handle table filter button press
		 * 
		 * @public
		 */
		handleFilterButtonPressed: function () {
			this.getViewSettingsDialog("ZSAMF005A.ZSAMF005A.view.fragment.ItemsFilterDialog")
				.then(function (oViewSettingsDialog) {
					oViewSettingsDialog.open();
				});
		},

		/**
		 * Filter table after dialog confirmation
		 * 
		 * @public
		 */
		handleFilterDialogConfirm: function (oEvent) {
			var mParams = oEvent.getParameters(),
				oBinding = this._oOrderItems.getBinding("items"),
				aFilters = [];

			mParams.filterItems.forEach(function (oItem) {
				const sKey = oItem.getKey();

				switch (sKey) {
				case "notDeleted":
					oFilter = new sap.ui.model.Filter({
						path: "Loekz",
						operator: "EQ",
						value1: "X"
					});
					break;
				case "cleaningDeletion":
					oFilter = new sap.ui.model.Filter({
						path: "Bsgru",
						operator: "EQ",
						value1: "Z01"
					});
					break;
				case "clipppingDeletion":
					oFilter = new sap.ui.model.Filter({
						path: "Bsgru",
						operator: "EQ",
						value1: "Z02"
					});
					break;
				case "fioriDeletion":
					oFilter = new sap.ui.model.Filter({
						path: "Bsgru",
						operator: "EQ",
						value1: "Z06"
					});
					break;
				default:
					var aSplit = sKey.split("___"),
						sPath = aSplit[0],
						sOperator = aSplit[1],
						sValue1 = aSplit[2],
						sValue2 = aSplit[3],
						oFilter = new sap.ui.model.Filter(sPath, sOperator, sValue1, sValue2);
				}
				aFilters.push(oFilter);
			});

			// Apply filter settings
			oBinding.filter(aFilters);

			// Update filter bar
			this.byId("vsdFilterBar").setVisible(aFilters.length > 0);
			this.byId("vsdFilterLabel").setText(mParams.filterString);
		},

		/* =========================================================== */
		/*                                                             */
		/* =========================================================== */

		/**
		 * Open Stock Details Dialog when the stock value is pressed
		 */
		onObjectNumberPress: function (oEvent) {
			var oSelectedItem = oEvent.getSource().getParent(),
				oBindingContext = oSelectedItem.getBindingContext("itemsModel"),
				oView = this.getView();

			// Create dialog lazily
			if (!this._oItemStockDetailsDialog) {
				this._oItemStockDetailsDialog = Fragment.load({
					id: oView.getId(),
					name: "ZSAMF005A.ZSAMF005A.view.fragment.ItemStockDetailsDialog",
					controller: this
				});
			}
			// Open dialog
			this._oItemStockDetailsDialog.then(function (oDialog) {
				this._oDialog = oDialog;
				oView.addDependent(oDialog);
				this._oDialog.setBindingContext(oBindingContext, "itemsModel");
				this._oDialog.open();
			}.bind(this));
		},

		/**
		 * Close the opened Dialog on the view
		 */
		onCancelButtonPress: function () {
			this._oDialog.close();
		},

		/* =========================================================== */
		/*                                                             */
		/* =========================================================== */

		/**
		 * IconTabBar selected key
		 * 
		 * @public
		 */
		onTabSelected: function () {
			const sKey = this._oIconTabBar.getSelectedKey();
			var oViewModel = this.getView().getModel("viewModel");

			switch (sKey) {
			case "searchItems":
				oViewModel.setProperty("/selectedTab", "searchItems");
				this._oOrderItems.setGrowing(false);
				this.onProductsSelectDialogRequested(null);
				break;
			case "orderItems":
			default:
				oViewModel.setProperty("/selectedTab", "orderItems");
				this._oOrderItems.setGrowing(true);
				this._aSearchedItems = [];
				this._applyOrderItemsFilter();
				break;
			}
		},

		/**
		 * Apply the correct filter on selected tab
		 * 
		 * @private
		 */
		_applyOrderItemsFilter: function () {
			// Access the dialog within the fragment
			var oSortDialog = this.byId("idViewSettingsDialogSort"),
				oFilterDialog = this.byId("idViewSettingsDialogFilter");
			// Access the items binding
			var oBinding = this._oOrderItems.getBinding("items"),
				aSorters = [],
				aFilters = [];

			// Filter for searchItems tab
			if (this._aSearchedItems && this._aSearchedItems.length > 0) {
				this._aSearchedItems.forEach(function (oItem) {
					aFilters.push(new sap.ui.model.Filter("Matnr", sap.ui.model.FilterOperator.EQ, oItem.Matnr));
				});
				
				// Apply filter settings
				oBinding.filter(aFilters);

				// Update filter bar
				this.byId("vsdFilterBar").setVisible(false);
				this.byId("vsdFilterLabel").setText("");
			} else { // Filter for orderItems tab
				// Set the initial filter option
				if (oFilterDialog) {
					oFilterDialog.setSelectedFilterCompoundKeys({
						"deletedItems": {
							"notDeleted": true,
							"cleaningDeletion": true,
							"clipppingDeletion": true,
							"fioriDeletion": true
						}
					});
	
					// setTimeout(function () {
						oFilterDialog.fireConfirm({
							filterItems: oFilterDialog.getSelectedFilterItems(),
							filterString: oFilterDialog.getSelectedFilterString()
						});
					// }.bind(this), 300);
				}
			}
			
			// Set dialog sort 
			oSortDialog.setSelectedSortItem("ActivityId");
			oSortDialog.setSortDescending(false);

			// Apply sort settings
			aSorters.push(
				new sap.ui.model.Sorter("ActivityId", false),
				new sap.ui.model.Sorter("FamilyId", false),
				new sap.ui.model.Sorter("SubFamilyId", false),
				new sap.ui.model.Sorter("Matnr", false)
			);

			// Sort and Filter order's items
			oBinding.sort(aSorters);
		},

		/* =========================================================== */
		/*                                                             */
		/* =========================================================== */

		/**
		 * Keep the input value positive
		 * 
		 * @public
		 */
		onStockInputLiveChanged: function (oEvent) {
    		var iValue = parseInt(oEvent.getSource().getValue().replace(/[^\d]/g, ''), 10);
    		
    		if (!isNaN(iValue)) {
		        oEvent.getSource().setValue(iValue);
		    } else {
		        oEvent.getSource().setValue("");
		    }
		},

		/**
		 * Get the value of item quantity
		 * in the input field
		 * 
		 * @public
		 */
		onStockInputChanged: function (oEvent) {
			this._updateQuantity(oEvent, 0, true); // true for Input Update
		},

		/**
		 * Increment item quatity on add button press
		 * 
		 * @public
		 */
		onIncrementPress: function (oEvent) {
			this._updateQuantity(oEvent, 1, false); // false for Button Update
		},

		/**
		 * Decrement item quatity on less button press
		 * 
		 * @public
		 */
		onDecrementPress: function (oEvent) {
			this._updateQuantity(oEvent, -1, false); // false for Button Update
		},

		/**
		 * Update order's item
		 * Create draft item
		 * 
		 * @public
		 */
		_updateQuantity: function (oEvent, iDelta, bMode) {
			var oView = this.getView(),
				oParentHBox = oEvent.getSource().getParent(),
				oRowItem = oParentHBox.getParent(),
				oInput = oParentHBox.getItems()[0];

			// Get the corresponding item from the model
			var oContext = oParentHBox.getBindingContext("itemsModel"),
				oModel = oContext.getModel(),
				sPath = oContext.getPath(),
				oItem = oContext.getObject();

			var iQuantity = oItem.Menge,
				iNewQuantity = parseInt(oInput.getValue()) + iDelta;

			// bMode === true : Input Field Update
			// bMode === false : Buttons pressed
			if (bMode) {
				// Check if quantity is negative
				if (iNewQuantity < 0) {
					oInput.setValue(parseInt(iQuantity));
					return;
				}

				// Check if item is in shortage
				if (oItem.QtyPenu === 'X' && iNewQuantity > iQuantity) {
					oInput.setValue(parseInt(iQuantity));

					// Add warning message to MessageManager
					this._addMessage(this._oResourceBundle.getText("errorQtyPenuMessageText", [oItem.Matnr]), "Warning");
					return;
				}

				// Check if the item quantity exceeded the quantity in ZBOT_BLOC_CDE
				if (oItem.ZqteBloc !== -1 && iNewQuantity > oItem.ZqteBloc) {
					oInput.setValue(parseInt(iQuantity));

					// Add warning message to MessageManager
					this._addMessage(this._oResourceBundle.getText("errorQtyMaxMessageText", [oItem.Matnr, oItem.ZqteBloc]), "Warning");
					return;
				}
			}
			// Set input value
			oInput.setValue(iNewQuantity);
			// Update the quantity in the model
			oModel.setProperty(sPath + "/Menge", iNewQuantity);

			if (oItem.Draft === true) {
				// Make the item no longer a draft
				oModel.setProperty(sPath + "/Draft", false);
				// Set item quantity
				oItem.Menge = iNewQuantity + ".000";
				// Create the item in the order
				this._createItem(oItem);
			} else {
				// Add the update to the queue
				this._aUpdateQueue.push({

					Ebeln: oItem.Ebeln,
					Ebelp: oItem.Ebelp,
					Menge: iNewQuantity + ".000"

				});

				// Process the queue if it's not already being processed
				if (!this._bUpdateInProgress) {
					// Set the flag to true before processing updates
					this._bUpdateInProgress = true;
					this._processUpdateQueue();
				}
			}
		},

		/**
		 * Send OData request to update 
		 * the wanted item quantity
		 * 
		 * @private
		 */
		_processUpdateQueue: function () {
			if (this._aUpdateQueue.length === 0) {
				this._bUpdateInProgress = false;
				this._addDisappearingMessages();

				setTimeout(function () {
					// Refresh order's header
					this._oHeaderModel.refresh();
					// Refresh order's items
					this._oItemsModel.refresh();
					// Reset all changes done to the model
					this._oItemsModel.resetChanges()
				}.bind(this), 1000);

				return;
			}

			// Get the next update from the queue
			// Fill update object
			const oUpdateItem = this._aUpdateQueue.shift();

			// Update the quantity in the backend using OData
			this._oItemsModel.update(`/itemCmdSet(Ebeln='${oUpdateItem.Ebeln}',Ebelp='${oUpdateItem.Ebelp}')`, oUpdateItem, {
				success: function (oData, oResponse) {
					// Handle successful update
					// if (oResponse.statusCode === 204) {
					// 	// Refresh order's header
					// 	// this._oHeaderModel.refresh();
					// }
					// Process the next update in the queue
					this._processUpdateQueue();
				}.bind(this),
				error: function (oError) {
					// Process the next update in the queue
					this._processUpdateQueue();
				}.bind(this)
			});
		},

		/**
		 * Send OData request to create
		 * the wanted item
		 * 
		 * @private
		 */
		_createItem: function (oItem) {
			// Item to create
			const oCreateItem = {
				Ebeln: oItem.Ebeln,
				Ebelp: oItem.Ebelp,
				Maktx: oItem.Maktx,
				Matnr: oItem.Matnr,
				Meins: oItem.Meins,
				Menge: oItem.Menge
			};

			// Create Entry request
			this._oItemsModel.create("/itemCmdSet", oCreateItem, {
				success: function (oData, oResponse) {
					// Handle successful update
					// Refresh order's header
					this._oHeaderModel.refresh();
					// Refresh order's items
					this._oItemsModel.refresh();
				}.bind(this),
				error: function (oError) {
					// Process the next update in the queue
					this._processUpdateQueue();
				}.bind(this)
			});
		},

		/* =========================================================== */
		/*                                                             */
		/* =========================================================== */

		/**
		 * Open Available Products SelectDialog
		 * 
		 * @public
		 */
		onProductsSelectDialogRequested: function (oEvent) {
			var oView = this.getView();

			// Get Order's Items Keys
			// this._bindOrderItemsKeys();

			// Create Available Products Select Dialog
			if (!this._pAvailableProductsSelectDialog) {
				this._pAvailableProductsSelectDialog = Fragment.load({
					id: oView.getId(),
					name: "ZSAMF005A.ZSAMF005A.view.fragment.ProductsSelectDialog",
					controller: this
				}).then(function (oSelectDialog) {
					oView.addDependent(oSelectDialog);
					return oSelectDialog;
				});
			}

			this._pAvailableProductsSelectDialog.then(function (oSelectDialog) {
				// Apply filter to the items binding of the value help dialog
				oSelectDialog.getBinding("items").filter([
					new sap.ui.model.Filter("Ebeln", "EQ", this._ebeln)
				]);

				// open value help dialog filtered
				oSelectDialog.open();
			}.bind(this));
		},

		/**
		 * Handle search on Available Products SelectDialog
		 * 
		 * @public
		 */
		onProductsSelectDialogSearch: function (oEvent) {
			var sValue = oEvent.getParameter("value"),
				oBinding = oEvent.getParameter("itemsBinding");

			// Set filters
			oBinding.filter([
				new sap.ui.model.Filter("Maktx", sap.ui.model.FilterOperator.Contains, sValue),
				new sap.ui.model.Filter("Matnr", sap.ui.model.FilterOperator.Contains, sValue),
				new sap.ui.model.Filter("Ebeln", "EQ", this._ebeln)
			]);
		},

		/**
		 * Handle Available Products SelectDialog Select/Close event
		 * 
		 * @public
		 */
		onProductsSelectDialogClose: function (oEvent) {
			var aSelectedContexts = oEvent.getParameter("selectedContexts");

			// Reset array
			this._aSearchedItems = [];

			// Check if a product was selected
			if (aSelectedContexts && aSelectedContexts.length > 0) {
				aSelectedContexts.forEach(function (oContext) {
					const oItem = oContext.getObject();
					// Check if item is out of stock
					if (oItem.Rupture === true) {
						// Add warning message to MessageManager
						this._addMessage(this._oResourceBundle.getText("errorItemOutOfStock", [oItem.Matnr]), "Warning");
						return;
					}
					// Check if item has no sale price
					if (oItem.NoSalePrice === true) {
						// Add warning message to MessageManager
						this._addMessage(this._oResourceBundle.getText("errorNoSalePrice", [oItem.Matnr]), "Warning");
						return;
					}

					// Add product to the seached items array
					this._aSearchedItems.push(oItem);
				}.bind(this));
			}
			
			if(this._aSearchedItems && this._aSearchedItems.length > 0) {
				this._applyOrderItemsFilter();
			} else {
				this._oIconTabBar.setSelectedKey("orderItems");
				this.onTabSelected();
			}

			return;

			// OLD PROCESS

			if (!aSelectedContexts) return;

			var oExistingItems = new Set(this._orderItemsKeys.map(function (oItem) {
				return oItem.Matnr;
			}));

			// Set Batch
			this._oItemsModel.setUseBatch(true)
				// Set Batch group
			var aDeferredGroups = this._oItemsModel.getDeferredGroups();
			this._oItemsModel.setDeferredGroups(aDeferredGroups.concat(["batchCreate"]));
			// Set request parameters
			var mParameters = {
				groupId: "batchCreate",
				success: function (oData, oResponse) {
					// Set Batch
					this._oItemsModel.setUseBatch(false);
					// Handle successful create
					setTimeout(function () {
						// Refresh order's header
						this._oHeaderModel.refresh();
						// Refresh order's items
						this._oItemsModel.refresh();
					}.bind(this), 1000);
				}.bind(this),
				error: function (oError) {
					// Set Batch
					this._oItemsModel.setUseBatch(false);
					// Handle error during create
					setTimeout(function () {
						// Refresh order's header
						this._oHeaderModel.refresh();
					}.bind(this), 1000);
					// Show error toast
					this._showErrorToast();
				}.bind(this)
			};

			aSelectedContexts.forEach(function (oContext) {
				var oSelectedObject = oContext.getObject();

				// Check if item is out of stock
				if (oSelectedObject.Rupture === true) {
					// Add warning message to MessageManager
					this._addMessage(this._oResourceBundle.getText("errorItemOutOfStock", [oSelectedObject.Matnr]), "Warning");
					return;
				}

				// Check if the item already exists in the Set
				if (!oExistingItems.has(oSelectedObject.Matnr)) {
					oSelectedObject = {
						Ebeln: oSelectedObject.Ebeln,
						Ebelp: "00000",
						Maktx: oSelectedObject.Maktx,
						Matnr: oSelectedObject.Matnr,
						Meins: oSelectedObject.Meins,
						Menge: "1"
					};

					// Create Entry request
					this._oItemsModel.createEntry("/itemCmdSet", {
						properties: oSelectedObject,
						groupId: "batchCreate"
					});
				}
			}.bind(this));

			// Submit batch process
			this._oItemsModel.submitChanges(mParameters);
		},

		/* =========================================================== */
		/*                                                             */
		/* =========================================================== */

		/**
		 * Display reason of ordering
		 * in a popover when the delete
		 * icon is pressed
		 * 
		 * @public
		 */
		handleDeletePopoverPress: function (oEvent) {
			var oIcon = oEvent.getSource();
			var sTooltip = oIcon.getTooltip();

			var oTooltipPopover = new sap.m.Popover({
				title: sTooltip,
				content: null
			});

			oTooltipPopover.openBy(oIcon);
		},

		/**
		 * Show confirmation dialog before deleting
		 * the current order
		 * 
		 * @public
		 */
		onDeleteOrder: function (oEvent) {
			// Show confirmation MessageBox
			MessageBox.confirm(this._oResourceBundle.getText("confirmDeleteOrderText"), {
				onClose: function (sAction) {
					if (sAction === MessageBox.Action.OK) {
						this._deleteOrder();
					}
				}.bind(this)
			});
		},

		/**
		 * Send OData request to delete 
		 * the current order
		 * 
		 * @private
		 */
		_deleteOrder: function () {
			var oView = this.getView();

			// Set busy indicator
			oView.setBusy(true);
			// Delete Order
			this._oHeaderModel.remove(`/headerCmdSet('${this._ebeln}')`, {
				success: function (oData, oResponse) {
					// Set busy indicator
					oView.setBusy(false);
					// Navigate to orders view
					this.onNavBack();
				}.bind(this),
				error: function (oError) {
					// Set busy indicator
					oView.setBusy(false);
				}.bind(this)
			})
		},

		/* =========================================================== */
		/*                                                             */
		/* =========================================================== */
		/**
		 * Get the Active Range families
		 * and show them in a dialog list
		 * 
		 * @public
		 */
		handleActiveRangeButtonPressed: function (oEvent) {
			var oView = this.getView();

			if (!this._oFamiliesDialog) {
				this._oFamiliesDialog = new sap.m.Dialog({
					title: this._oResourceBundle.getText("familiesText"),
					content: new sap.m.List({
						items: {
							path: "/gameActiveSet",
							filters: [
								new sap.ui.model.Filter("Ebeln", "EQ", this._ebeln)
							],
							template: new sap.m.StandardListItem({
								title: "{FamilyDescription}",
								type: "Active"
							})
						},
						itemPress: this._getActiveRangeProducts.bind(this)
					}),
					endButton: new sap.m.Button({
						text: this._oResourceBundle.getText("closeText"),
						press: function () {
							this._oFamiliesDialog.close();
						}.bind(this)
					})
				});

				// To get access to the controller's model
				oView.addDependent(this._oFamiliesDialog);
			}

			this._oFamiliesDialog.open();
		},

		/**
		 * 
		 * 
		 * @private
		 */
		_getActiveRangeProducts: function (oEvent) {
			// Close dialog
			this._oFamiliesDialog.close();

			// Get Selected Family
			var oView = this.getView(),
				oSelectedItem = oEvent.getParameter("listItem"),
				oSelectedContext = oSelectedItem.getBindingContext(),
				oSelectedFamily = oSelectedContext.getObject();

			oView.getModel("activeRangeModel").setData({
				activeRangeProducts: [],
				selectedFamily: oSelectedFamily
			});

			this._openActiveRangeProductsDialog();
		},

		/**
		 * 
		 * 
		 * @private
		 */
		_openActiveRangeProductsDialog: function () {
			var oView = this.getView();

			// Create dialog lazily
			if (!this._oActiveRangeProductsDialog) {
				this._oActiveRangeProductsDialog = Fragment.load({
					id: oView.getId(),
					name: "ZSAMF005A.ZSAMF005A.view.fragment.ActiveRangeProductsDialog",
					controller: this
				});
			}
			// Open dialog
			this._oActiveRangeProductsDialog.then(function (oDialog) {
				this._oDialog = oDialog;
				oView.addDependent(oDialog);
				this._oDialog.open();
			}.bind(this));

			// 	oDataModel = this.getOwnerComponent().getModel();
			// // Disable batch
			// oDataModel.setUseBatch(false);
			// // Set busy indicator
			// oView.setBusy(true);
			// // Call the function import with POST method
			// oDataModel.callFunction("/ADD_ITEMS_FROM_FAMILLE", {
			// 	method: "POST",
			// 	urlParameters: {
			// 		Ebeln: oSelectedObject.Ebeln,
			// 		Famille: oSelectedObject.Famille
			// 	},
			// 	success: function (oData, oResponse) {
			// 		// Set busy indicator
			// 		oView.setBusy(false);
			// 		// Handle the success response here if needed
			// 		console.log("Item added successfully!", oData, oResponse);

			// 		this.getView().getElementBinding().refresh(true);
			// 	}.bind(this),
			// 	error: function (oError) {
			// 		// Set busy indicator
			// 		oView.setBusy(false);
			// 		// Handle the error response here if needed
			// 		console.log(oError)
			// 		if (oError.statusCode === 400) {
			// 			var oErrorData = JSON.parse(oError.responseText).error,
			// 				sMsg = this._oResourceBundle.getText("errorMessageText", [oErrorData.code, oErrorData.message.value]);

			// 			// Display the error message to the user using MessageBox or MessageToast
			// 			MessageBox.error(sMsg);
			// 			return;
			// 		} else {
			// 			this._showErrorToast();
			// 		}

			// 		this.getView().getElementBinding().refresh(true);
			// 	}.bind(this)
			// });
		},

		/**
		 * Event handler for navigating back
		 * 
		 * @public
		 */
		onNavBack: function () {
			// Get the router instance from the component
			var oRouter = this.getOwnerComponent().getRouter();
			
			// Reset searched items
			this._aSearchedItems = [];
			// Go to the initial tab
			this._oIconTabBar.setSelectedKey("orderItems");

			// Navigate to Details Page
			oRouter.navTo("RouteOrdersList", {}, true);
		},

		/**
		 * Route Matched Event on OrderDetails View
		 * 
		 * @private
		 */
		_onRouteMatched: function (oEvent) {
			var oArgs = oEvent.getParameter("arguments"),
				oView = this.getView();

			// Set Order's number globally
			this._ebeln = oArgs.orderNumber;

			if (this._oHeaderModel.oData) {
				this._oHeaderModel.invalidate();
			}

			// Bind Order's data to the view
			oView.bindElement({
				path: "/headerCmdSet('" + this._ebeln + "')",
				model: "headerModel",
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function (oEvent) {
						oView.setBusy(true);
					},
					dataReceived: function (oEvent) {
						oView.setBusy(false);
					}.bind(this)
				}
			});

			// Bind elements to the view
			this._bindView();
		},

		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {string} sPath path to the object to be bound
		 * @private
		 */
		_bindView: function (sPath = "") {
			this.getView().bindElement({
				path: sPath
			});
			// Get Order's Items
			this._bindOrderItems();
			// Get Families
			this._bindHierarchyList();
			// Get Messages (for errors and warnings)
			this._bindMessagePopover();
		},

		/**
		 * Check if binding was successful
		 * navigate to not found page if not
		 * 
		 * @private
		 */
		_onBindingChange: function (oEvent) {
			var oRouter = this.getOwnerComponent().getRouter(),
				oData = this._oHeaderModel.getProperty(`/headerCmdSet('${this._ebeln}')`);

			// No data for the binding
			if (!oData) {
				oRouter.getTargets().display("notFound");
			} else {
				if (oData.Guname) {
					MessageBox.error(this._oResourceBundle.getText("orderIsInEditModeBy", [oData.Guname]));
				}
			}
		},

		/**
		 * Bind the order's items to the Items Table
		 * 
		 * @private
		 */
		_bindOrderItems: function () {
			this._oOrderItems.bindItems({
				path: `/headerCmdSet('${this._ebeln}')/HeaderToItemSet`,
				sorter: [
					new sap.ui.model.Sorter("ActivityId", false),
					new sap.ui.model.Sorter("FamilyId", false),
					new sap.ui.model.Sorter("SubFamilyId", false),
					new sap.ui.model.Sorter("Matnr", false)
				],
				template: this._oOrderItemsTemplate,
				model: "itemsModel"
			});

			// Reset all changes done to the model
			this._oItemsModel.resetChanges();

			// Set default tab
			this.onTabSelected();
		},

		/**
		 * Bind the order's items keys to an Array
		 * Used to check occurence check
		 * 
		 * @private
		 */
		_bindOrderItemsKeys: function () {
			var oModel = this.getOwnerComponent().getModel();

			oModel.read(`/headerCmdSet('${this._ebeln}')/item_cmd_keysSet`, {
				success: function (oData, oResponse) {
					// Set Items in array
					this._orderItemsKeys = oData.results;
				}.bind(this),
				error: function (oError) {
					// Set array to empty
					this._orderItemsKeys = [];
					// Show error message
					this._showErrorToast();
				}.bind(this)
			})
		},

		/**
		 * Bind the Hierarchy List
		 * Used for the select popover in the active ranges
		 * 
		 * @private
		 */
		_bindHierarchyList: function () {

		},
		
		/**
		 * Init ViewSettingDialog
		 * 
		 * @private
		 */
		_initViewSettingDialog: function () {
			// Get the fragment by its name and create a dialog reference
			this.getViewSettingsDialog("ZSAMF005A.ZSAMF005A.view.fragment.ItemsSortDialog");
			this.getViewSettingsDialog("ZSAMF005A.ZSAMF005A.view.fragment.ItemsFilterDialog");
		},

		/**
		 * Bind Message Popover to the view
		 * This will show error and warning messages
		 * 
		 * @private
		 */
		_bindMessagePopover: function () {
			// Set message model
			var oView = this.getView();

			oView.setModel(this._oMessageManager.getMessageModel(), "message");

			this._oMessageManager.registerObject(oView, true);

			this._oMessageManager.removeAllMessages();
		},

		/**
		 * Keep Messages from disappearing
		 *  
		 * @private
		 */
		_addDisappearingMessages: function () {
			// Backup existing messages
			var aMessagesBackup = this._oMessageManager.getMessageModel().getData();

			setTimeout(function () {
				// Re-add the backed-up messages
				this._oMessageManager.getMessageModel().setData(aMessagesBackup);
			}.bind(this), 4000);
		},

		/**
		 * Add message to the MessageManager
		 * 
		 * @private
		 */
		_addMessage: function (sMessage, sType) {
			this._oMessageManager.addMessages(new sap.ui.core.message.Message({
				message: sMessage,
				type: sType,
				processor: this.getView().getModel()
			}));
		},

		/**
		 * Open MessagePopover
		 * 
		 * @public
		 */
		onMessagePopoverPress: function (oEvent) {
			var oSourceControl = oEvent.getSource();
			this._getMessagePopover().then(function (oMessagePopover) {
				oMessagePopover.openBy(oSourceControl);
			});
		},

		/**
		 * Initiate MessagePopover fragment
		 * 
		 * @private
		 */
		_getMessagePopover: function () {
			var oView = this.getView();
			// create popover lazily (singleton)
			if (!this._pMessagePopover) {
				this._pMessagePopover = Fragment.load({
					id: oView.getId(),
					name: "ZSAMF005A.ZSAMF005A.view.fragment.MessagePopover",
					controller: this
				}).then(function (oMessagePopover) {
					oView.addDependent(oMessagePopover);
					return oMessagePopover;
				});
			}
			return this._pMessagePopover;
		},

		/**
		 * Show server error toast
		 * 
		 * @private
		 */
		_showErrorToast: function () {
			var sErrorMessage = this._oResourceBundle.getText("errorOccurredText");

			MessageToast.show(sErrorMessage, {
				duration: 5000, // Duration in milliseconds
				width: "15em", // Toast width
			});
		}
	});
});