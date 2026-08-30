import { describe, expect, it } from "vitest"

import {
    jsonBodyErrorResponse,
    readJsonBody,
} from "./request-json"

describe("readJsonBody", () => {
    it("rejects a declared body before parsing", async () => {
        const request = new Request("http://localhost", {
            method: "POST",
            headers: { "content-length": "100" },
            body: JSON.stringify({ ok: true }),
        })

        const result = await readJsonBody(request, 10)
        expect(result).toEqual({ ok: false, reason: "too_large" })
    })

    it("rejects an oversized body without Content-Length while streaming", async () => {
        const request = new Request("http://localhost", {
            method: "POST",
            body: JSON.stringify({ text: "😀😀😀" }),
        })

        const result = await readJsonBody(request, 15)
        expect(result).toEqual({ ok: false, reason: "too_large" })
    })

    it("returns parsed JSON and distinguishes malformed JSON", async () => {
        const valid = new Request("http://localhost", {
            method: "POST",
            body: JSON.stringify({ destination: "Lisbon" }),
        })
        const invalid = new Request("http://localhost", {
            method: "POST",
            body: "{not-json",
        })

        await expect(readJsonBody(valid, 1_000)).resolves.toEqual({
            ok: true,
            data: { destination: "Lisbon" },
        })
        await expect(readJsonBody(invalid, 1_000)).resolves.toEqual({
            ok: false,
            reason: "invalid",
        })
    })

    it("returns structured 400 and 413 responses", async () => {
        const invalid = jsonBodyErrorResponse({ ok: false, reason: "invalid" })
        const tooLarge = jsonBodyErrorResponse({ ok: false, reason: "too_large" })

        expect(invalid.status).toBe(400)
        await expect(invalid.json()).resolves.toEqual({
            error: "Invalid JSON body.",
            code: "INVALID_JSON",
        })
        expect(tooLarge.status).toBe(413)
        await expect(tooLarge.json()).resolves.toEqual({
            error: "Request body is too large.",
            code: "REQUEST_BODY_TOO_LARGE",
        })
    })
})
