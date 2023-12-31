import CryptoJS from "crypto-js";
import crypto from 'node:crypto';

/**
 * @author (Bot) systemrobot on Discord
 * @license MIT
 * 
 * @summary Tricksplit.io's Bot Protection - Precisely translated in JS from WASM.
 * 
 * - Initial Authentication:
 *    - Auto-generates a 3-element Uint32Array packet on socket open.
 *    - Index 0 is seeded with the current date for packet validity.
 *    - Indices 1 & 2 contain crypto-random values.
 *    - These random values are XOR'd in the order (Index 2 ^ Index 1) to form the encryption key, referred to as 'first' in the game's embind.
 * 
 * - Bytecode Layer:
 *    - Server sends an AES-salted bytecode to the client.
 *    - Use CryptoJS to decrypt this message using the encryption key.
 *    - The decrypted output appears as random characters. Convert these to charcodes to obtain the VM bytecode.
 * 
 * - VM Processing:
 *    - The bytecode is processed to solve a token and do checks (NodeJS, etc...).
 *    - The solved token is stored in CanvasCaptureMediaStreamTrack.contextBufferFactory.
 *    - This layer is called 'vm' in the game's embind.
 * 
 * - Final Authentication:
 *    - To interact in-game, send the solved token XOR'd with the encryption key, along with a random seed, to the server.
 *    - This step is named 'final' in the game's embind.
 */

export class TricksplitWasmInstance {
    constructor() {
        this.encryptionKey = NaN;
        this.CanvasCaptureMediaStreamTrack = {
            contextBufferFactory: 0
        };
    }

    #toUnsignedInt32(int) {
        return int >>> 0;
    }

    #checkAndFloorUnsignedInt32(int) {
        return int >= 4294967296.0 || int < 0.0 ? 0 : Math.floor(int);
    }

    #getRandomValue() {
        return this.#checkAndFloorUnsignedInt32(crypto.getRandomValues(new Uint32Array(1))[0]);
    }

    #generateRandomSeed() {
        const generateSeedKey = Date.now() / 1000.0;

        let tempIntCheck = 0;

        if (Math.abs(generateSeedKey) < 2147483648.0) {
            tempIntCheck = Math.floor(generateSeedKey);
        } else {
            tempIntCheck = -2147483648;
        }

        return tempIntCheck;
    }

    #generateRandomSecureKeys() {
        const keyPairOne = this.#toUnsignedInt32(this.#getRandomValue());
        const keyPairTwo = this.#toUnsignedInt32(this.#getRandomValue());

        return [keyPairOne, keyPairTwo];
    }

    #extractAES(charByteCode) {
        return String.fromCharCode.apply(null, charByteCode);
    }

    processVMBytecode(byteCode) {
        // Fixed for NodeJS (Albeit akwardly).

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
                    var result = popTwo[popOne];

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

    first() {
        const authenticationPacket = new Uint32Array(3);

        const generatedmakeSeededConstant = this.#generateRandomSeed();
        const [keyPairOne, keyPairTwo] = this.#generateRandomSecureKeys();

        authenticationPacket[0] = this.#toUnsignedInt32(generatedmakeSeededConstant ^ 0xff1d296);
        authenticationPacket[1] = this.#toUnsignedInt32(keyPairOne ^ (generatedmakeSeededConstant ^ 0xff1c1a1) / 2 ^ 0x1a4);
        authenticationPacket[2] = this.#toUnsignedInt32(keyPairTwo ^ (generatedmakeSeededConstant ^ 0xff1c1a1) / 4 ^ 0x45);

        this.encryptionKey = (keyPairTwo ^ keyPairOne);

        return authenticationPacket.buffer;
    }

    decrypt(encryptedData) {
        encryptedData = this.#extractAES(encryptedData);

        var vmByteCode = [];

        var decrypt = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey + "");
        var string = decrypt.toString(CryptoJS.enc.Utf8);

        for (let i = 0; i < string.length; i++) {
            vmByteCode.push(string.charCodeAt(i));
        }

        return vmByteCode;
    }

    final() {
        return this.encryptionKey ^ this.CanvasCaptureMediaStreamTrack.contextBufferFactory;
    }

    randomSeed() {
        return 100000000 * Math.random() + 20000000;
    }
}

export class Reader {
    constructor(buffer) {
        this.dataView = null;
        this.offset = 0;
        this.maxOffset = 0;
        this.dataView = new DataView(buffer);
        this.maxOffset = this.dataView.byteLength;
    }

    readUInt8() {
        const value = this.dataView.getUint8(this.offset);
        this.offset++;
        return value;
    }

    readInt8() {
        const value = this.dataView.getInt8(this.offset);
        this.offset++;
        return value;
    }

    readUInt16() {
        const value = this.dataView.getUint16(this.offset, true);
        this.offset += 2;
        return value;
    }

    readInt16() {
        const value = this.dataView.getInt16(this.offset, true);
        this.offset += 2;
        return value;
    }

    readUInt32() {
        const value = this.dataView.getUint32(this.offset, true);
        this.offset += 4;
        return value;
    }

    readInt32() {
        const value = this.dataView.getInt32(this.offset, true);
        this.offset += 4;
        return value;
    }

    readFloat32() {
        const value = this.dataView.getFloat32(this.offset, true);
        this.offset += 4;
        return value;
    }

    readFloat64() {
        const value = this.dataView.getFloat64(this.offset, true);
        this.offset += 8;
        return value;
    }

    readUTF8string() {
        let value = "";
        while (!this.endOfBuffer()) {
            const charCode = this.readUInt8();
            if (charCode === 0) {
                break;
            }
            value += String.fromCharCode(charCode);
        }
        return value;
    }

    readEscapedUTF8string() {
        return this.readUTF8string();
    }

    readUTF16string() {
        let value = "";
        while (true) {
            const charCode = this.readUInt16();
            if (charCode === 0) {
                break;
            }
            value += String.fromCharCode(charCode);
        }
        return value;
    }

    readEscapedUTF16string() {
        const value = this.readUTF16string();
        return decodeURIComponent(escape(value));
    }

    endOfBuffer() {
        return this.offset >= this.maxOffset;
    }
}

export class Writer {
    constructor(size, endian = true) {
        this.size = size;
        this.Endian = endian;
        this.Buffer = new DataView(new ArrayBuffer(size));
        this.Offset = 0;
    }

    writeInt8(val) {
        this.Buffer.setInt8(this.Offset, val);
    }

    writeInt16(val) {
        this.Buffer.setInt16(this.Offset, val, true);
        this.Offset += 2;
    }

    writeInt32(val) {
        this.Buffer.setInt32(this.Offset, val, true);
        this.Offset += 4;
    }

    writeUint8(val) {
        this.Buffer.setUint8(this.Offset++, val);
    }

    writeUint16(val) {
        this.Buffer.setUint16(this.Offset, val, true);
        this.Offset += 2;
    }

    writeUint32(val) {
        this.Buffer.setUint32(this.Offset, val, true);
        this.Offset += 4;
    }

    writeFloat32(val) {
        this.Buffer.setFloat32(this.Offset, val, true);
        this.Offset += 4;
    }

    writeFloat64(val) {
        this.Buffer.setFloat64(this.Offset, val, true);
        this.Offset += 8;
    }

    writeUTF8String(str) {
        for (let i = 0; i < str.length; i++) {
            this.writeUint8(str.charCodeAt(i));
        }
        this.Offset++;
    }

    writeUTF16String(str) {
        for (let i = 0; i < str.length; i++) {
            this.writeUint16(String.fromCharCode(i));
        }
        this.Offset += 2;
    }

    get getBuffer() {
        return this.Buffer.buffer;
    }
}