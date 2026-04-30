import {
  addDays,
  dateForThisWeeksDay,
  dayKeyFromDate,
  dayOfWeekShort,
  isDateString,
  parseDateString,
  shortMonthDay,
  startOfWeekMonday,
  todayLocal,
  toLocalDateString,
} from "./dates";

describe("isDateString", () => {
  it("accepts YYYY-MM-DD", () => {
    expect(isDateString("2026-04-30")).toBe(true);
  });

  it("rejects malformed input", () => {
    expect(isDateString("2026-4-30")).toBe(false);
    expect(isDateString("04-30-2026")).toBe(false);
    expect(isDateString("not a date")).toBe(false);
    expect(isDateString("")).toBe(false);
  });
});

describe("toLocalDateString", () => {
  it("formats local-timezone Y/M/D with zero-padding", () => {
    expect(toLocalDateString(new Date(2026, 0, 1))).toBe("2026-01-01");
    expect(toLocalDateString(new Date(2026, 11, 9))).toBe("2026-12-09");
  });
});

describe("todayLocal", () => {
  it("uses the injected `now` when provided", () => {
    expect(todayLocal(new Date(2026, 3, 30))).toBe("2026-04-30");
  });
});

describe("parseDateString", () => {
  it("round-trips with toLocalDateString", () => {
    const s = "2026-04-30";
    expect(toLocalDateString(parseDateString(s))).toBe(s);
  });
});

describe("addDays", () => {
  it("adds and subtracts days within a month", () => {
    expect(addDays("2026-04-30", 1)).toBe("2026-05-01");
    expect(addDays("2026-04-30", -1)).toBe("2026-04-29");
  });

  it("crosses month boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("crosses year boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("handles leap-year February", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2028-02-29", 1)).toBe("2028-03-01");
  });
});

describe("startOfWeekMonday", () => {
  // 2026-04-30 is a Thursday
  it("returns the same date when given a Monday", () => {
    expect(startOfWeekMonday("2026-04-27")).toBe("2026-04-27");
  });

  it("snaps a mid-week date back to its Monday", () => {
    expect(startOfWeekMonday("2026-04-30")).toBe("2026-04-27");
  });

  it("snaps Sunday back to the *previous* Monday (not forward)", () => {
    // 2026-05-03 is a Sunday → previous Monday is 2026-04-27
    expect(startOfWeekMonday("2026-05-03")).toBe("2026-04-27");
  });
});

describe("dayOfWeekShort", () => {
  it("returns the 3-letter capitalized day-of-week", () => {
    expect(dayOfWeekShort("2026-04-27")).toBe("MON");
    expect(dayOfWeekShort("2026-04-30")).toBe("THU");
    expect(dayOfWeekShort("2026-05-03")).toBe("SUN");
  });
});

describe("shortMonthDay", () => {
  it("formats MM/DD with zero-padding", () => {
    expect(shortMonthDay("2026-04-30")).toBe("04/30");
    expect(shortMonthDay("2026-12-09")).toBe("12/09");
  });
});

describe("dayKeyFromDate", () => {
  it("returns the lowercase DayKey for a given date", () => {
    expect(dayKeyFromDate("2026-04-27")).toBe("monday");
    expect(dayKeyFromDate("2026-04-30")).toBe("thursday");
    expect(dayKeyFromDate("2026-05-03")).toBe("sunday");
  });
});

describe("dateForThisWeeksDay", () => {
  // Today = Thursday 2026-04-30 → this week = Mon 04/27 ... Sun 05/03
  const thursday = new Date(2026, 3, 30);

  it("returns the current week's Monday", () => {
    expect(dateForThisWeeksDay("monday", thursday)).toBe("2026-04-27");
  });

  it("returns the current week's Thursday (today)", () => {
    expect(dateForThisWeeksDay("thursday", thursday)).toBe("2026-04-30");
  });

  it("returns the current week's Sunday (forward across month boundary)", () => {
    expect(dateForThisWeeksDay("sunday", thursday)).toBe("2026-05-03");
  });

  it("when called on a Sunday, anchors to the previous Monday", () => {
    const sunday = new Date(2026, 4, 3); // 2026-05-03
    expect(dateForThisWeeksDay("monday", sunday)).toBe("2026-04-27");
    expect(dateForThisWeeksDay("sunday", sunday)).toBe("2026-05-03");
  });
});
