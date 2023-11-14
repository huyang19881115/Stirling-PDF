import * as PDFJS from 'pdfjs-dist';
import type { PDFDocumentProxy as PDFJSDocument } from 'pdfjs-dist/types/src/display/api';
import { PDFDocument as PDFLibDocument } from 'pdf-lib';

import Joi from 'joi';

export enum RepresentationType {
    Uint8Array,
    PDFLibDocument,
    PDFJSDocument
}

export class PdfFile {
    private representation: Uint8Array | PDFLibDocument | PDFJSDocument;
    private representationType: RepresentationType;
    originalFilename: string;
    filename: string;

    get uint8Array() : Promise<Uint8Array> {
        switch (this.representationType) {
            case RepresentationType.Uint8Array:
                return new Promise((resolve, reject) => {
                    resolve(this.representation as Uint8Array);
                });
            case RepresentationType.PDFLibDocument:
                return new Promise(async (resolve, reject) => {
                    var uint8Array = await (this.representation as PDFLibDocument).save();
                    this.uint8Array = uint8Array;
                    resolve(uint8Array);
                });
            case RepresentationType.PDFJSDocument:
                return new Promise(async (resolve, reject) => {
                    var uint8Array = await (this.representation as PDFJSDocument).getData();
                    this.uint8Array = uint8Array;
                    resolve(uint8Array);
                });
            default:
                console.error("unhandeled PDF type: " + typeof this.representation as string);
                throw Error("unhandeled PDF type");
        } 
    }
    set uint8Array(value: Uint8Array) {
        this.representation = value;
        this.representationType = RepresentationType.Uint8Array;
    }

    get pdflibDocument() : Promise<PDFLibDocument> {
        switch (this.representationType) {
            case RepresentationType.PDFLibDocument:
                return new Promise((resolve, reject) => {
                    resolve(this.representation as PDFLibDocument);
                });
            default:
                return new Promise(async (resolve, reject) => {
                    var uint8Array = await this.uint8Array;
                    var pdfLibDoc = await PDFLibDocument.load(uint8Array, {
                        updateMetadata: false,
                    });
                    this.pdflibDocument = pdfLibDoc;
                    resolve(pdfLibDoc);
                });
        } 
    }
    set pdflibDocument(value: PDFLibDocument) {
        this.representation = value;
        this.representationType = RepresentationType.PDFLibDocument;
    }

    get pdfjsDocument() : Promise<PDFJSDocument> {
        switch (this.representationType) {
            case RepresentationType.PDFJSDocument:
                return new Promise((resolve, reject) => {
                    resolve(this.representation as PDFJSDocument);
                });
            default:
                return new Promise(async (resolve, reject) => {
                    const pdfjsDoc = await PDFJS.getDocument(await this.uint8Array).promise;
                    this.pdfjsDocument = pdfjsDoc;
                    resolve(pdfjsDoc);
                });
        } 
    }
    set pdfjsDocument(value: PDFJSDocument) {
        this.representation = value;
        this.representationType = RepresentationType.PDFJSDocument;
    }

    constructor(originalFilename: string, representation: Uint8Array | PDFLibDocument | PDFJSDocument, representationType: RepresentationType, filename?: string) {
        this.originalFilename = originalFilename;
        this.filename = filename ? filename : originalFilename;

        this.representation = representation;
        this.representationType = representationType;
    }

    static fromMulterFile(value: Express.Multer.File): PdfFile {
        return new PdfFile(value.originalname, value.buffer as Uint8Array, RepresentationType.Uint8Array);
    }
    static fromMulterFiles(values: Express.Multer.File[]): PdfFile[] {
        return values.map(v => PdfFile.fromMulterFile(v));
    }
}

export const PdfFileSchema = Joi.any().custom((value, helpers) => {
    if (!(value instanceof PdfFile)) {
        throw new Error('value is not a PdfFile');
    }
    return value;
}, "PdfFile validation");