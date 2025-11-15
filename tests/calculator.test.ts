import { describe, it, expect } from "vitest";
import { Calculator } from "../src/calculator.js";

describe("Calculator", () => {
  const calculator = new Calculator();

  describe("add", () => {
    it("should add two positive numbers", () => {
      expect(calculator.add(2, 3)).toBe(5);
    });

    it("should add negative numbers", () => {
      expect(calculator.add(-2, -3)).toBe(-5);
    });

    it("should add zero", () => {
      expect(calculator.add(5, 0)).toBe(5);
    });
  });

  describe("subtract", () => {
    it("should subtract two numbers", () => {
      expect(calculator.subtract(5, 3)).toBe(2);
    });

    it("should handle negative results", () => {
      expect(calculator.subtract(3, 5)).toBe(-2);
    });
  });

  describe("multiply", () => {
    it("should multiply two numbers", () => {
      expect(calculator.multiply(3, 4)).toBe(12);
    });

    it("should multiply by zero", () => {
      expect(calculator.multiply(5, 0)).toBe(0);
    });
  });

  describe("divide", () => {
    it("should divide two numbers", () => {
      expect(calculator.divide(10, 2)).toBe(5);
    });

    it("should throw error when dividing by zero", () => {
      expect(() => calculator.divide(10, 0)).toThrow("Division by zero");
    });
  });
});
