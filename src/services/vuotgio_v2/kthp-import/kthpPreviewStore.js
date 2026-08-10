"use strict";

const crypto = require("crypto");

class KthpPreviewStore {
    constructor({ ttlMs = 15 * 60 * 1000, maxEntries = 1000 } = {}) {
        this.ttlMs = ttlMs;
        this.maxEntries = maxEntries;
        this.entries = new Map();
    }

    cleanup(now = Date.now()) {
        for (const [token, entry] of this.entries) {
            if (entry.expiresAt <= now) this.entries.delete(token);
        }
        while (this.entries.size >= this.maxEntries) {
            this.entries.delete(this.entries.keys().next().value);
        }
    }

    create(payload, actorId) {
        this.cleanup();
        const token = crypto.randomUUID();
        this.entries.set(token, {
            payload: JSON.parse(JSON.stringify(payload)),
            actorId: String(actorId),
            expiresAt: Date.now() + this.ttlMs,
            inProgress: false,
        });
        return token;
    }

    acquire(token, actorId) {
        this.cleanup();
        const entry = this.entries.get(token);
        if (!entry) {
            const error = new Error("Preview token không tồn tại hoặc đã hết hạn");
            error.code = "PREVIEW_TOKEN_INVALID";
            throw error;
        }
        if (entry.actorId !== String(actorId)) {
            const error = new Error("Preview token không thuộc người dùng hiện tại");
            error.code = "PREVIEW_TOKEN_FORBIDDEN";
            throw error;
        }
        if (entry.inProgress) {
            const error = new Error("Preview token đang được xử lý");
            error.code = "PREVIEW_TOKEN_IN_PROGRESS";
            throw error;
        }
        entry.inProgress = true;
        return JSON.parse(JSON.stringify(entry.payload));
    }

    peek(token, actorId) {
        this.cleanup();
        const entry = this.entries.get(token);
        if (!entry) {
            const error = new Error("Preview token không tồn tại hoặc đã hết hạn");
            error.code = "PREVIEW_TOKEN_INVALID";
            throw error;
        }
        if (entry.actorId !== String(actorId)) {
            const error = new Error("Preview token không thuộc người dùng hiện tại");
            error.code = "PREVIEW_TOKEN_FORBIDDEN";
            throw error;
        }
        return JSON.parse(JSON.stringify(entry.payload));
    }

    complete(token) {
        this.entries.delete(token);
    }

    release(token) {
        const entry = this.entries.get(token);
        if (entry) entry.inProgress = false;
    }
}

module.exports = KthpPreviewStore;
