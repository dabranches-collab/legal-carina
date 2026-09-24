import { expect, test } from "vitest";
import { suggestedClientCodes } from "./clientCodes";

test("sugere a primeira lacuna livre em cada série, incluindo códigos de fichas sem perfil", () => {
  const codes = suggestedClientCodes([
    { client_code: "02.0001" },
    { client_code: "02.0003" },
    { client_code: "02.0003" },
    { client_code: "01.0002" },
  ]);
  expect(codes).toEqual({ individual: "02.0002", company: "01.0001" });
});

test("avança quando não há lacunas e respeita números sem zeros à esquerda", () => {
  const codes = suggestedClientCodes([
    { client_code: "02.1" },
    { client_code: "02.0002" },
    { client_code: "01.0001" },
    { client_code: "01.0002" },
  ]);
  expect(codes).toEqual({ individual: "02.0003", company: "01.0003" });
});
