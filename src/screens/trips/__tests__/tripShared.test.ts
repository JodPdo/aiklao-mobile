const { avatarColor, AVATAR_PALETTE } = require('../tripShared');

describe('avatarColor', () => {
    it('คืนสีจาก palette เสมอ (ค่าปกติ)', () => {
        expect(AVATAR_PALETTE).toContain(avatarColor('U1234567'));
    });

    it('input เดิมได้สีเดิมเสมอ', () => {
        expect(avatarColor('Uabcde')).toBe(avatarColor('Uabcde'));
    });

    it('"U1" -> charCode("1")=49, 49%6=1', () => {
        expect(avatarColor('U1')).toBe(AVATAR_PALETTE[1]);
    });

  // it.each = data-driven test (เทคนิค QA: เคสเดียว ครอบหลายข้อมูล)
    it.each([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'])(
        'input "U%s" อยู่ในช่วง index 0..5 (ไม่ undefined)',
        (c) => {
        expect(avatarColor('U' + c)).toBeDefined();
        },
    );

    it('string ว่าง -> สีแรก (NaN กลายเป็น 0)', () => {
        expect(avatarColor('')).toBe(AVATAR_PALETTE[0]);
    });

    it('string ยาว 1 ตัว -> สีแรก', () => {
        expect(avatarColor('U')).toBe(AVATAR_PALETTE[0]);
    });
});