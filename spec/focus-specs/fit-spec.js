describe("only runs the 'fit' spec", () => {
  it("doesn't run this 'it'", () => {
    expect(true).toBe(false);
  });
  fit("only runs this 'fit' spec", () => {
    expect(true).toBe(true);
  });
});
