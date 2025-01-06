/* global QUnit*/

sap.ui.define([
	"sap/ui/test/Opa5",
	"ZSAMF005A/ZSAMF005A/test/integration/pages/Common",
	"sap/ui/test/opaQunit",
	"ZSAMF005A/ZSAMF005A/test/integration/pages/HEADER",
	"ZSAMF005A/ZSAMF005A/test/integration/navigationJourney"
], function (Opa5, Common) {
	"use strict";
	Opa5.extendConfig({
		arrangements: new Common(),
		viewNamespace: "ZSAMF005A.ZSAMF005A.view.",
		autoWait: true
	});
});