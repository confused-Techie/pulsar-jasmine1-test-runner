describe("only runs the 'ffit' spec", () => {
  it("doesn't run this 'it' spec", () => {
    expect(true).toBe(false);
  });
  fit("doesn't run this 'fit' spec", () => {
    expect(true).toBe(false);
  });
  ffit("only runs this 'ffit' spec", () => {
    expect(true).toBe(true);
  });
});
