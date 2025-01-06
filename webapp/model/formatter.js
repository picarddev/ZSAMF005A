sap.ui.define([
	"sap/base/strings/formatMessage"
], function (formatMessage) {
	"use strict";

	return {
		formatMessage: formatMessage,

		/** 
		 * Retourne le nom du client en majuscule
		 * No de commande EKKO-EBELN / T161-BATXT
		 */
		cmdNumberFormatter: function (cmd, type) {
			var sName = cmd + " " + type;
			return sName;
		},

		/** 
		 * R12 : EKET-EINDT avec EKET-EBELN = EKPO-EBELN et EKET-EBELP = EKPO-EBELP 
		 * et EKET-ETENR = ‘1’
		 * VALW-W_ZEIT avec VALW-ROUTE = EKPV-ROUTE
		 */
		dateDeliveryFormatter: function (date, time) {
			var deliveryDate = date + " " + time;
			return deliveryDate;
		},

		/**
		 * Display key icon next to cmd
		 * when it is not editable
		 */
		displayKeyIcon: function (bEditable, sGuname) {
			return bEditable === false && sGuname === '';
		},

		/**
		 * Set order's status text using i18n
		 */
		statusFormatter: function (iStatus) {
			var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();

			switch (iStatus) {
			case "1":
				return oBundle.getText("statusProposed");
			case "2":
				return oBundle.getText("statusAjusted");
			case "3":
				return oBundle.getText("statusInProgress");
			case "4":
				return oBundle.getText("statusShipped");
			case "5":
				return oBundle.getText("statusReceived");
			case "6":
				return oBundle.getText("statusDeleted");
			default:
				return oBundle.getText("statusUnknown");
			}
		},

		/**
		 * Set order's status color
		 * 
		 * @public
		 */
		statusColorFormatter: function (iStatus) {
			switch (iStatus) {
			case "1":
				return "Green";
			case "2":
				return "Yellow";
			case "3":
				return "Orange";
			case "4":
				return "Skyblue";
			case "5":
				return "Navy";
			case "6":
				return "Red";
			default:
				return "Grey";
			}
		},

		/*********************************************************************************************/
		/*
		/*********************************************************************************************/

		/**
		 * Format item's infos string
		 * 
		 * @public
		 */
		itemInfosFormatter: function (sMatnr, sMeins, sMtstbActuel, sMtstbFutur) {
			var sItemInfos = sMatnr + "/" + sMeins + "\n";

			if (sMtstbActuel)
				sItemInfos += sMtstbActuel + (sMtstbFutur ? "→" + sMtstbFutur : "");

			return sItemInfos;
		},

		/**
		 * Parse value to integer
		 * then add unit
		 * 
		 * @public
		 */
		parseStockIntoInteger: function (iLabst, sMeins) {
			return parseInt(iLabst) + " " + sMeins;
		},

		/**
		 * Parse value to integer
		 * then add unit
		 * 
		 * @public
		 */
		parseExpectedIntoInteger: function (iMng01, sMeins) {
			return parseInt(iMng01) + " " + sMeins;
		},

		/**
		 * Parse value to integer
		 * then add unit
		 * 
		 * @public
		 */
		parseMetchStockIntoInteger: function (iStockMerch) {
			return iStockMerch ? parseInt(iStockMerch) : "";
		},

		/**
		 * Parse value to integer
		 * then add unit
		 * 
		 * @public
		 */
		parseSalesForecastIntoInteger: function (iQtyRetour, iNbjPrevision, sMeinsBase) {
			return parseInt(iQtyRetour) + "/" + parseInt(iNbjPrevision) + " " + sMeinsBase;
		},

		/**
		 * Parse value to integer
		 * then add unit
		 * 
		 * @public
		 */
		parseMRPQtyIntoInteger: function (iZzqteOrg, sMeins) {
			return parseInt(iZzqteOrg) + " " + sMeins;
		},

		/**
		 * Parse value to integer
		 * 
		 * @public
		 */
		parseWantedQtyIntoInteger: function (iMenge) {
			return parseInt(iMenge);
		},

		/**
		 * Parse value to integer
		 * 
		 * @public
		 */
		parseCouverageDaysIntoInteger: function (iNbjCouverture) {
			return parseInt(iNbjCouverture);
		},

		/*********************************************************************************************/
		/*
		/*********************************************************************************************/

		/**
		 * Set post's stock status color
		 * 
		 * @public
		 */
		stockStateFormatter: function (iStock) {
			if (iStock > 0)
				return "Success";
			else if (iStock < 0)
				return "Error";
			else
				return "Warning";
		},

		/**
		 * Show Command delete button
		 * 
		 * @public
		 */
		showDeleteButton: function (sSelectedTab, iStatus, bHeaderEditable) {
			if (sSelectedTab === 'searchItems')
				return false;
				
			return iStatus !== '6' && bHeaderEditable === true;
		},

		/*********************************************************************************************/
		/* Posts Table Quantity formatters
		/*********************************************************************************************/

		/**
		 * Enable or disable post's quantity input field
		 * 
		 * @public
		 */
		checkQtyInput: function (bPostEditable, bHeaderEditable, bNotActivatable) {
			if (bHeaderEditable === false)
				return false;
			else if (bPostEditable === false)
				return false;
			else if (bNotActivatable === true)
				return false;

			return true;
		},

		/**
		 * Enable or disable post's quantity decrement button
		 * 
		 * @public
		 */
		checkQtyDecrement: function (iMenge, bPostEditable, bHeaderEditable) {
			if (bHeaderEditable === false)
				return false;

			return bPostEditable === true && iMenge > 0;
		},

		/**
		 * Enable or disable post's quantity increment button
		 * 
		 * @public
		 */
		checkQtyIncrement: function (iMenge, sQtyPenu, iZqteBloc, bPostEditable, bHeaderEditable, bNotActivatable) {
			if (bHeaderEditable === false)
				return false;
			else if (bPostEditable === false)
				return false;
			else if (sQtyPenu === 'X')
				return false;
			else if (iZqteBloc >= 0 && iMenge >= iZqteBloc)
				return false;
			else if (bNotActivatable === true)
				return false;

			return true;
		},
		
		/*********************************************************************************************/
		/* Products List Dialog (Search)
		/*********************************************************************************************/

		/**
		 * Show warnings for product
		 * 
		 * @public
		 */
		 productWarnings: function (bRupture, bNoSalePrice) {
		 	var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
		 	const sOutOfStock = oBundle.getText("outOfStock"),
		 	      sNoSalePrice = oBundle.getText("noSalePrice");
		 	
			if (bRupture === true && bNoSalePrice === true)
				return [sOutOfStock, sNoSalePrice].join(" - ");
			else if (bRupture === true)
				return sOutOfStock;
			else if (bNoSalePrice === true)
				return sNoSalePrice;
				
			return '';
		}
	};
});