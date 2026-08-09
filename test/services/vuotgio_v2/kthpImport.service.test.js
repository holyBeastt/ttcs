"use strict";

const service = require("../../../src/services/vuotgio_v2/kthpImport.service");

describe("kthpImport.service canonical facade", () => {
    afterEach(() => jest.restoreAllMocks());

    test("exposes only preview/commit/context over the orchestrator", async () => {
        const previewArgs = {
            source: "EXCEL",
            input: Buffer.from("xlsx"),
            actor: { id: 7 },
        };
        const previewSpy = jest.spyOn(service.orchestrator, "preview")
            .mockResolvedValue({ previewToken: "token-1" });
        const commitSpy = jest.spyOn(service.orchestrator, "commit")
            .mockResolvedValue({ saved: 1, skipped: 0, ids: [11] });
        const contextSpy = jest.spyOn(service.orchestrator, "getPreviewContext")
            .mockReturnValue({ semester: 1 });

        await expect(service.preview(previewArgs))
            .resolves.toEqual({ previewToken: "token-1" });
        await expect(service.commit({
            previewToken: "token-1",
            actor: { id: 7 },
        })).resolves.toEqual({ saved: 1, skipped: 0, ids: [11] });
        expect(service.getPreviewContext("token-1", { id: 7 }))
            .toEqual({ semester: 1 });

        expect(previewSpy).toHaveBeenCalledWith(previewArgs);
        expect(commitSpy).toHaveBeenCalledWith({
            previewToken: "token-1",
            actor: { id: 7 },
        });
        expect(contextSpy).toHaveBeenCalledWith("token-1", { id: 7 });
        expect(service.parseExcelFile).toBeUndefined();
        expect(service.importToDB).toBeUndefined();
    });
});
