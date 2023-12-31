import crypto from 'node:crypto';

/**
 * @author (Bot) systemrobot on Discord
 * @license MIT
 * 
 * @summary Senpa.io's Bot Protection - Precisely translated in JS from WASM.
 * 
 * 1. **Initial Handshake**: A new WebSocket is created, and an initial packet with random values (4) is sent. 
 *    These random values form half of the encryption keys (8).
 * 
 * 2. **Key Formation**: Upon successful handshake, the server sends two packets of lengths 65 and 16. 
 *    The WASM parses these packets to form decryption keys (65) and an authentication packet (16).
 * 
 * 3. **Secret and LCG Initialization**: A solved secret is calculated using the authentication keys, 
 *    and a Linear Congruential Generator (LCG) is initialized for future encryption.
 * 
 * 4. **Encryption Activation**: Once the server verifies the 16-length packet, encryption is enabled for 
 *    both client-to-server and server-to-client communications.
 * 
 * 5. **VM Bytecode Processing**: The server sends VM bytecode, which the WASM processes to solve for a token. 
 *    The token is stored in `CanvasCaptureMediaStreamTrack.contextBufferFactory`.
 * 
 * 6. **Final Authentication**: A final token is sent, XOR'd by the solved secret and the solved token. If verified by the server, 
 *    the client can fully interact with the game. All subsequent communications remain encrypted.
 * 
 */

export class SenpaWasmInstance {
    constructor() {
        this.encryptionKeys = new Uint32Array(8);
        this.decryptionKeys = NaN;
        this.solvedSecret = NaN;
        this.CanvasCaptureMediaStreamTrack = {
            contextBufferFactory: NaN
        };
        this.customMersenneTwister = NaN;
        this.encryptionEnabled = false;
        this.socket = NaN;
    }

    convertTo32BitSignedIntInRange(num) {
        if (num < 4294967296.0 & num >= this.to32BitSignedInt(0.0)) {
            return this.to32BitSignedInt(this.to32BitUnsignedInt(Math.floor(num)));
        }
        return this.to32BitSignedInt(0);
    }

    convertTo32BitUnsignedIntInRange(num) {
        if (num < 4294967296.0 && num >= this.to32BitSignedInt(0.0)) {
            return this.to32BitUnsignedInt(Math.floor(num));
        }
        return 0;
    }

    to32BitSignedInt(num) {
        return num | 0;
    }

    to32BitUnsignedInt(int) {
        return int >>> 0;
    }

    generateRandom32BitSignedInt() {
        return this.to32BitSignedInt(this.convertTo32BitSignedIntInRange(this.to32BitSignedInt(crypto.getRandomValues(new Uint32Array(1))[0])));
    }

    generateSecureKey() {
        return this.to32BitSignedInt(this.generateRandom32BitSignedInt());
    }

    randomSeed() {
        return Math.random() * 100000000.0 + 20000000.0;
    }

    initializeAuthentication() {
        const authArray = new Uint32Array(5);

        const firstRandomValue = this.generateSecureKey();
        const secondRandomValue = this.generateSecureKey();
        const thirdRandomValue = this.generateSecureKey();
        const fourthRandomValue = this.generateSecureKey();

        const seed = this.generateSecureKey();

        const normalizedRandom = this.to32BitUnsignedInt(((this.to32BitUnsignedInt((seed))) / this.to32BitSignedInt((this.to32BitUnsignedInt(11181))))) * 11181.0;

        const primarySeed = this.convertTo32BitUnsignedIntInRange(normalizedRandom);

        authArray[0] = this.to32BitSignedInt(primarySeed ^ 0x1337); // LEET - Nice :V
        authArray[1] = this.to32BitSignedInt(((this.to32BitSignedInt(primarySeed >>> 1)) ^ this.to32BitSignedInt(firstRandomValue)) ^ 420); // 420 - Nice :V
        authArray[2] = this.to32BitSignedInt(((this.to32BitSignedInt(primarySeed >>> 2)) ^ this.to32BitSignedInt(secondRandomValue)) ^ 69); // 69 - Nice :V
        authArray[3] = this.to32BitSignedInt(((this.to32BitSignedInt(primarySeed >>> 3)) ^ this.to32BitSignedInt(thirdRandomValue)) ^ 420); // 420 - Nice :V
        authArray[4] = this.to32BitSignedInt((this.to32BitSignedInt((this.to32BitSignedInt(fourthRandomValue)) ^ (this.to32BitSignedInt(primarySeed >>> 4)))) ^ 69); // 69 - Nice :V

        this.encryptionKeys[0] = firstRandomValue;
        this.encryptionKeys[1] = secondRandomValue;
        this.encryptionKeys[2] = thirdRandomValue;
        this.encryptionKeys[3] = fourthRandomValue;

        return authArray.buffer;
    }

    processServerKeys(packet) {
        const authBuffer = new Uint32Array(4);

        const incomingPacket = new Uint32Array(packet);

        const primarySeed = this.to32BitSignedInt(this.to32BitSignedInt(this.encryptionKeys[0]) ^ this.to32BitSignedInt(this.encryptionKeys[1]));

        const firstAuthValue = this.to32BitSignedInt((this.to32BitSignedInt(incomingPacket[0]) ^ this.to32BitSignedInt((this.to32BitSignedInt(primarySeed >>> 1)))) ^ 420); // 420 - Nice :V
        const secondAuthValue = this.to32BitSignedInt((this.to32BitSignedInt(incomingPacket[1]) ^ this.to32BitSignedInt((this.to32BitSignedInt(primarySeed >>> 2)))) ^ 69); // 69 - Nice :V
        const thirdAuthValue = this.to32BitSignedInt((this.to32BitSignedInt(incomingPacket[2]) ^ this.to32BitSignedInt((this.to32BitSignedInt(primarySeed >>> 3)))) ^ 420); // 420 - Nice :V
        const fourthAuthValue = this.to32BitSignedInt((this.to32BitSignedInt(incomingPacket[3]) ^ this.to32BitSignedInt((this.to32BitSignedInt(primarySeed >>> 4)))) ^ 69); // 69 - Nice :V

        authBuffer[0] = firstAuthValue;
        authBuffer[1] = secondAuthValue;
        authBuffer[2] = thirdAuthValue;
        authBuffer[3] = fourthAuthValue;

        this.encryptionKeys[4] = firstAuthValue;
        this.encryptionKeys[5] = secondAuthValue;
        this.encryptionKeys[6] = thirdAuthValue;
        this.encryptionKeys[7] = fourthAuthValue;

        this.solvedSecret = this.to32BitSignedInt((this.to32BitSignedInt(this.encryptionKeys[6])) ^ (this.to32BitSignedInt(this.encryptionKeys[1])));

        this.encryptionKeys = new Uint8Array(this.encryptionKeys.buffer);

        this.customMersenneTwister = this.Lcg64Bit(this.encryptionKeys.length);

        if (this.decryptionKeys !== NaN) {
            this.encryptionEnabled = true;
        }

        return authBuffer.buffer;
    }

    completeAuthentication() {
        const packet = new DataView(new ArrayBuffer(10));

        const xorVal = this.to32BitSignedInt((this.to32BitSignedInt(this.CanvasCaptureMediaStreamTrack.contextBufferFactory)) ^ (this.to32BitSignedInt(this.solvedSecret)));

        packet.setUint8(0x0, 0x14);
        packet.setUint8(0x1, 1);
        packet.setInt32(0x2, xorVal, true);
        packet.setInt32(0x6, this.randomSeed(), true);

        return packet.buffer;
    }

    processDecryptionKeys(keys) {
        const decryptionKeys = [];

        for (let index = 1; index < 65; index++) {
            index = index + 1;
            decryptionKeys.push(this.to32BitSignedInt(keys.getUint8(index) ^ 0xb2));
        }

        this.decryptionKeys = new Uint8Array(decryptionKeys);
    }

    encryptMessage(inputMessageBuffer) {
        if (!this.encryptionEnabled) throw new Error("Encryption is not enabled.");

        const inputParsed = new Uint8Array(inputMessageBuffer);
        const inputLength = inputParsed.length;
        const keyArrayLength = this.encryptionKeys.length;

        const encryptedPacket = new Uint8Array(inputLength + 1);

        let mersenneTwister = this.customMersenneTwister();
        let keyIndex = 0;

        encryptedPacket[keyIndex] = mersenneTwister;

        for (let messageIndex = 0; messageIndex < inputLength; messageIndex++) {
            if (keyArrayLength === mersenneTwister) {
                mersenneTwister = 0;
            }

            const currentByte = inputParsed[messageIndex];

            const tempKeyIndex = mersenneTwister;
            mersenneTwister++;

            const xorKey = this.encryptionKeys[tempKeyIndex];

            const encryptedByteIndex = messageIndex + 1;

            const encryptedByte = currentByte ^ xorKey;

            encryptedPacket[encryptedByteIndex] = encryptedByte;
        }

        return encryptedPacket.buffer;
    }

    decryptMessage(encryptedMessageBuffer) {
        if (!this.encryptionEnabled) throw new Error("Decryption is not enabled.");

        const encryptedMessage = new Uint8Array(encryptedMessageBuffer);
        const encryptedLength = encryptedMessage.length;
        let initialKeyIndex = encryptedMessage[0];

        for (let messageIndex = 1; messageIndex < encryptedLength; messageIndex++) {
            const byteToDecrypt = encryptedMessage[messageIndex];
            const keyIndexToUse = (initialKeyIndex !== this.decryptionKeys.length) ? initialKeyIndex : 0;

            const decryptionKey = this.decryptionKeys[keyIndexToUse];

            encryptedMessage[messageIndex] = (decryptionKey ^ byteToDecrypt) & 0xFF;
            initialKeyIndex = keyIndexToUse + 1;
        }

        return encryptedMessage.slice(1).buffer;
    }

    Lcg64Bit(modulo = 32) {
        let internalState = BigInt("0");
        const multiplier = BigInt("6364136223846793005");
        const increment = BigInt(1);
        const shiftAmount = BigInt(33);

        return function computeNextLCGValue() {
            const updatedState = internalState * multiplier + increment;
            internalState = updatedState;
            return Number((updatedState >> shiftAmount) % BigInt(modulo));
        };
    }

    processVMBytecode(byteCode) {
        // Fixed for NodeJS.
        var processedBytes = Array.from(byteCode);

        var mainStack = [];
        var backupStack = [];

        for (var index = 0; index < processedBytes.length;) {
            var instructionSet = processedBytes[index++];

            switch (instructionSet) {
                case 0: {
                    break;
                }
                case 2: {
                    var popOne = mainStack.pop();
                    var result = backupStack[popOne];
                    mainStack.push(result);
                    break;
                }
                case 3: {
                    var popOne = mainStack.pop();
                    var popTwo = mainStack.pop();
                    backupStack[popOne] = popTwo;
                    break;
                }
                case 4: {
                    var lastElementIndex = mainStack.length - 1;
                    var result = mainStack[lastElementIndex];
                    mainStack.push(result);
                    break;
                }
                case 5: {
                    var popOne = mainStack.pop();
                    var popTwo = mainStack.pop();
                    mainStack.push(popOne);
                    mainStack.push(popTwo);
                    break;
                }
                case 16: {
                    var popOne = mainStack.pop();
                    var popTwo = mainStack.pop();
                    if (popOne == 0) {
                        mainStack.push(popTwo + popOne);
                    } else {
                        mainStack.push(0);
                    }
                    break;
                }
                case 17: {
                    var popOne = mainStack.pop();
                    var popTwo = mainStack.pop();
                    if (popOne == 0) {
                        mainStack.push(popTwo - popOne);
                    } else {
                        mainStack.push(0);
                    }
                    break;
                }
                case 18: {
                    var popOne = mainStack.pop();
                    var popTwo = mainStack.pop();
                    var result = Math.imul(popTwo, popOne);
                    mainStack.push(result);
                    break;
                }
                case 19: {
                    var popOne = mainStack.pop();
                    var popTwo = mainStack.pop();
                    if (popOne == 0) {
                        mainStack.push(popTwo / popOne);
                    } else {
                        mainStack.push(0);
                    }
                    break;
                }
                case 20: {
                    var popOne = mainStack.pop();
                    var popTwo = mainStack.pop();
                    mainStack.push(popTwo ^ popOne);
                    break;
                }
                case 21: {
                    var popOne = mainStack.pop();
                    var popTwo = mainStack.pop();
                    mainStack.push(popTwo << (popOne & 0x1f));
                    break;
                }
                case 22: {
                    var popOne = mainStack.pop();
                    var popTwo = mainStack.pop();
                    mainStack.push(popTwo >> (popOne & 0x1f));
                    break;
                }
                case 23: {
                    var popOne = mainStack.pop();
                    var popTwo = mainStack.pop();
                    mainStack.push(popTwo & popOne);
                    break;
                }
                case 32: {
                    var popOne = mainStack.pop();
                    mainStack.push(popOne ^ 0xffffffff);
                    break;
                }
                case 64: {
                    var stringTostringToProcess = mainStack.pop();
                    if (stringTostringToProcess.length < 1) {
                        stringTostringToProcess = "";
                    }

                    var processedArray = [];

                    for (var i = stringTostringToProcess.length - 1; i >= 0; i--) {
                        var charCode = stringTostringToProcess.charCodeAt(i);
                        var processedChar = charCode ^ 0xb2;
                        processedArray.push(processedChar);
                    }

                    mainStack.push(processedArray);
                    mainStack.push(stringTostringToProcess.length);
                    break;
                }
                case 65: {
                    var loopCount = mainStack.pop();
                    if (loopCount < 1) {
                        loopCount = 0;
                    }

                    var processedArray = [];

                    for (var i = 0; i < loopCount; i++) {
                        var nextInstruction = mainStack.pop();
                        nextInstruction = nextInstruction ^ 0xb2;
                        var newChar = String.fromCharCode(nextInstruction);
                        processedArray.push(newChar);
                    }

                    var newString = processedArray.join('');

                    mainStack.push(newString);
                    break;
                }
                case 66: {
                    var loopCount = processedBytes[index++];
                    if (loopCount < 1) {
                        loopCount = 0;
                    }

                    var processedArray = [];

                    for (var i = 0; i < loopCount; i++) {
                        var nextInstruction = processedBytes[index++];
                        nextInstruction = nextInstruction ^ 0xb2;
                        var newChar = String.fromCharCode(nextInstruction);
                        processedArray.push(newChar);
                    }

                    var newString = processedArray.join('');

                    mainStack.push(newString);
                    break;
                }
                case 67: {
                    var popOne = mainStack.pop();
                    var popTwo = mainStack.pop();

                    switch (popOne) {
                        case 'eval':
                            mainStack.push(eval);
                            break;
                        case 'toString':
                            mainStack.push(toString);
                            break;
                        case 'indexOf':
                            mainStack.push(Array.prototype.indexOf);
                            break;
                        case 'getAttribute':
                            mainStack.push('getAttribute');
                            break;
                        case 'CanvasCaptureMediaStreamTrack':
                            mainStack.push(this.CanvasCaptureMediaStreamTrack);
                            break;
                        default:
                            mainStack.push(0);
                            break;
                    }
                    break;
                }
                case 68: {
                    var popOne = mainStack.pop();
                    var popTwo = mainStack.pop();
                    var popThree = mainStack.pop();
                    popTwo[popOne] = popThree;
                    break;
                }
                case 48: {
                    index = mainStack.pop();
                    break;
                }
                case 49: {
                    var popOne = mainStack.pop();
                    var popTwo = mainStack.pop();
                    if (0 !== popTwo) {
                        index = popOne;
                    }
                    break;
                }
                case 132: {
                    var index1 = processedBytes[index++];
                    var index2 = processedBytes[index++];
                    var index3 = processedBytes[index++];
                    var index4 = processedBytes[index++];

                    mainStack.push(index1 | index2 << 8 | index3 << 0x10 | index4 << 0x18);
                    break;
                }
                case 133: {
                    var loopCount = mainStack.pop();

                    var processedArray = [];

                    for (var i = loopCount - 1; i >= 0; i--) {
                        processedArray[i] = mainStack.pop();
                    }

                    var _function = mainStack.pop();
                    var _args = mainStack.pop();

                    switch (_function) {
                        case eval:
                            function transformString(inputStr) {
                                const regex = /([a-zA-Z0-9_.]+)=function\(([^)]*)\)/;
                                const match = inputStr.match(regex);

                                if (match) {
                                    const funcName = match[1].split('.').pop();
                                    const params = match[2];
                                    const funcBody = inputStr.substring(match[0].length);

                                    const transformedStr = `(function ${funcName}(${params})${funcBody})`;

                                    return transformedStr;
                                } else {
                                    return "Pattern not found";
                                }
                            }

                            var transformed = [transformString(processedArray[0])];

                            var res = eval.apply(null, transformed);

                            mainStack.push(res);
                            break;
                        case 'getAttribute':
                            mainStack.push(null)
                            break;
                        case toString:
                        case Array.prototype.indexOf:
                            var res = _function.apply(_args, processedArray);

                            mainStack.push(res)
                            break;
                        default:
                            var res = _function.apply(_args, processedArray);

                            mainStack.push(res);
                            break;
                    }
                    break;
                }
                case 96: {
                    mainStack.push(0);
                    break;
                }
                case 80: {
                    return mainStack.pop();
                }
            }
        }
    }

    _alloc(eventType, eventHandler, eventObj) {
        switch (eventType) {
            case 1: {
                //console.log("Custom onOpen handler");

                this.socket._alloc(this.initializeAuthentication());
                break;
            }
            case 2: {
                //console.log("Custom onMessage handler");

                let data = eventObj.data;
                let processedData;

                if (this.encryptionEnabled) {
                    processedData = this.decryptMessage(data);
                    return eventHandler ? eventHandler(processedData) : null;
                } else {
                    //console.log(`Received message of length(s): ${data.byteLength}`);

                    if (data.byteLength === 65) {
                        this.processDecryptionKeys(new DataView(data));
                        return;
                    }

                    if (data.byteLength === 16) {
                        const serverKeys = this.processServerKeys(data);
                        this.socket._alloc(serverKeys);
                        return;
                    }

                    return null;
                }
            }
            case 3:
                //console.log("Custom onClose handler");
                break;
            case 4:
                //console.log("Custom onError handler");
                break;
            case 5: {
                //console.log("Custom send handler");

                let data = eventObj;

                if (this.encryptionEnabled) {
                    var encryptedData = this.encryptMessage(data);
                    // Use _alloc to send the encrypted data since it's the original send method
                    this.socket._alloc(encryptedData);
                } else {
                    // If encryption is not enabled, just send the original data
                    this.socket._alloc(data);
                }

                return;  // Prevent the original eventHandler from sending the data again
            }
            case 9: {
                this.socket.send(this.completeAuthentication());
                return;
            }
            default:
                break;
        }
        if (eventHandler) {
            return eventHandler(eventObj);
        }
    }

    create(ws) {
        const originalOnOpen = ws.onopen;
        const originalOnMessage = ws.onmessage;
        const originalOnClose = ws.onclose;
        const originalOnError = ws.onerror;
        const originalSend = ws.send.bind(ws);

        ws.onopen = (event) => {
            this._alloc(1, originalOnOpen, event);
        };
        ws.onmessage = (event) => {
            this._alloc(2, originalOnMessage, event);
        };
        ws.onclose = (event) => {
            this._alloc(3, originalOnClose, event);
        };
        ws.onerror = (event) => {
            this._alloc(4, originalOnError, event);
        };

        const _alloc = (data) => {
            this._alloc(5, null, data);
        };

        ws._alloc = originalSend;
        ws.send = _alloc.bind(this);

        this.socket = ws;

        return ws;
    }
}

export class BinaryReader {
    constructor(buffer) {
        this.view = new DataView(buffer);
        this.index = 0;
        this.maxIndex = buffer.byteLength;
    }

    readInt8() {
        let value = this.view.getInt8(this.index, true);
        this.index += 1;
        return value;
    }

    readUInt8() {
        let value = this.view.getUint8(this.index, true);
        this.index += 1;
        return value;
    }

    readInt16() {
        let value = this.view.getInt16(this.index, true);
        this.index += 2;
        return value;
    }

    readUInt16() {
        let value = this.view.getUint16(this.index, true);
        this.index += 2;
        return value;
    }

    readInt32() {
        let value = this.view.getInt32(this.index, true);
        this.index += 4;
        return value;
    }

    readUInt32() {
        let value = this.view.getUint32(this.index, true);
        this.index += 4;
        return value;
    }

    readFloat() {
        let value = this.view.getFloat32(this.index, true);
        this.index += 4;
        return value;
    }

    readDouble() {
        let value = this.view.getFloat64(this.index, true);
        this.index += 8;
        return value;
    }

    readString8() {
        let length = this.readUInt8();
        let value = "";
        for (let i = 0; i < length && !this.end; i++) {
            let charCode = this.readUInt8();
            value += String.fromCharCode(charCode);
        }
        return value;
    }

    readLongString8() {
        let length = this.readUInt16();
        let value = "";
        for (let i = 0; i < length && !this.end; i++) {
            let charCode = this.readUInt8();
            value += String.fromCharCode(charCode);
        }
        return value;
    }

    readString16() {
        let length = this.readUInt8();
        let value = "";
        for (let i = 0; i < length && !this.end; i++) {
            let charCode = this.readUInt16();
            value += String.fromCharCode(charCode);
        }
        return value;
    }
}

export class BinaryWriter {
    constructor(size = 128) {
        this.size = size;
        this.buffer = new ArrayBuffer(size);
        this.view = new DataView(this.buffer);
        this.index = 0;
        this.maxIndex = size;
    }

    writeInt8(value) {
        this.view.setInt8(this.index, value, true)
        this.index += 1
    }

    writeUInt8(value) {
        this.view.setUint8(this.index, value, true)
        this.index += 1
    }

    writeInt16(value) {
        this.view.setInt16(this.index, value, true)
        this.index += 2
    }

    writeUInt16(value) {
        this.view.setUint16(this.index, value, true)
        this.index += 2
    }

    writeInt32(value) {
        this.view.setInt32(this.index, value, true)
        this.index += 4
    }

    writeUInt32(value) {
        this.view.setUint32(this.index, value, true)
        this.index += 4
    }

    writeFloat(value) {
        this.view.setFloat32(this.index, value, true)
        this.index += 4
    }

    writeDouble(value) {
        this.view.setFloat64(this.index, value, true)
        this.index += 8
    }

    writeString8(value) {
        this.writeUInt8(value.length)
        for (let i = 0; i < value.length; i++) {
            const charCode = value.charCodeAt(i)
            this.writeUInt8(charCode)
        }
    }

    writeLongString8(value) {
        this.writeUInt16(value.length)
        for (let i = 0; i < value.length; i++) {
            const charCode = value.charCodeAt(i)
            this.writeUInt8(charCode)
        }
    }

    writeString16(value) {
        this.writeUInt8(value.length)
        for (let i = 0; i < value.length; i++) {
            const charCode = value.charCodeAt(i)
            this.writeUInt16(charCode)
        }
    }

    writeLongString16(value) {
        this.writeUInt16(value.length)
        for (let i = 0; i < value.length; i++) {
            const charCode = value.charCodeAt(i)
            this.writeUInt16(charCode)
        }
    }
} 