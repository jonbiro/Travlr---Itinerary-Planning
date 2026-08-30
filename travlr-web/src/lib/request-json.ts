const textEncoder = new TextEncoder()

export const JSON_BODY_LIMITS = {
    chat: 250_000,
    generateTrip: 32_000,
    packingList: 128_000,
    memory: 256_000,
    expense: 16_000,
    shareTrip: 16_000,
    trip: 16_000,
    tripTheme: 16_000,
} as const

export type JsonBodyResult<T> =
    | { ok: true; data: T }
    | { ok: false; reason: "invalid" | "too_large" }

export type JsonBodyErrorOptions = {
    invalidMessage?: string
    tooLargeMessage?: string
}

/**
 * Read a JSON request body without allowing an unexpectedly large payload to
 * reach validation or application code. Content-Length is checked first, and
 * the stream itself is counted so chunked or inaccurate requests cannot bypass
 * the limit. The serialized result is checked as a final defensive measure.
 */
export async function readJsonBody<T = unknown>(
    request: Request,
    maxBytes: number,
): Promise<JsonBodyResult<T>> {
    const contentLength = request.headers.get("content-length")
    if (contentLength) {
        const declaredBytes = Number(contentLength)
        if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
            return { ok: false, reason: "too_large" }
        }
    }

    const reader = request.body?.getReader()
    if (!reader) return { ok: false, reason: "invalid" }

    const chunks: string[] = []
    const decoder = new TextDecoder("utf-8", { fatal: true })
    let receivedBytes = 0
    try {
        while (true) {
            const { done, value } = await reader.read()
            if (done) break

            receivedBytes += value.byteLength
            if (receivedBytes > maxBytes) {
                await reader.cancel()
                return { ok: false, reason: "too_large" }
            }
            chunks.push(decoder.decode(value, { stream: true }))
        }
        chunks.push(decoder.decode())
    } catch {
        return { ok: false, reason: "invalid" }
    }

    let data: unknown
    try {
        data = JSON.parse(chunks.join(""))
    } catch {
        return { ok: false, reason: "invalid" }
    }

    let serialized: string
    try {
        serialized = JSON.stringify(data)
    } catch {
        return { ok: false, reason: "invalid" }
    }

    if (textEncoder.encode(serialized).byteLength > maxBytes) {
        return { ok: false, reason: "too_large" }
    }

    return { ok: true, data: data as T }
}

export function jsonBodyErrorResponse(
    result: Extract<JsonBodyResult<unknown>, { ok: false }>,
    options: JsonBodyErrorOptions = {},
): Response {
    const tooLarge = result.reason === "too_large"
    return Response.json(
        {
            error: tooLarge
                ? options.tooLargeMessage ?? "Request body is too large."
                : options.invalidMessage ?? "Invalid JSON body.",
            code: tooLarge ? "REQUEST_BODY_TOO_LARGE" : "INVALID_JSON",
        },
        { status: tooLarge ? 413 : 400 },
    )
}
