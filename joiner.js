// NOTE: If you're manually solving captchas, run this code with 'minionCount' as 1 each time

(() => {
    'use strict';

    const minionCount = 1;

    var e,n;if(minionCount>=(null===(e=gameObject.state.selectedServer)||void 0===e?void 0:e.maxPlayers))return void alert(atob('VG9vIG1hbnkgbWluaW9ucyByZXF1ZXN0ZWQgKHNlcnZlciBkb2Vzbid0IGhhdmUgZW5vdWdoIHNsb3RzKQ=='));if(minionCount>=25&&!confirm(atob('TW9yZSB0aGFuIDI1IG1pbmlvbnMgY2FuIGJlIGRldGVjdGVkLCBhcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gY29udGludWU=')))return;const t=SmartBuffer.fromSize(3);t.writeUInt8(4),t.writeUInt8(0),t.writeUInt8(minionCount),null===(n=gameObj.minion)||void 0===n||n.i_send(t)
})();
