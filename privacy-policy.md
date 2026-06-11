# AiKlao — Privacy Policy / นโยบายความเป็นส่วนตัว

**Last updated / ปรับปรุงล่าสุด:** 11 June 2026
**Application / แอปพลิเคชัน:** AiKlao — real-time group trip tracking (LINE Bot + LIFF + mobile app)
**Contact / ติดต่อ:** fontong.jod.aekkarut@gmail.com

> English version is below the Thai version. / ฉบับภาษาอังกฤษอยู่ถัดจากฉบับภาษาไทย

---

# 🇹🇭 นโยบายความเป็นส่วนตัว (ภาษาไทย)

AiKlao ("แอป", "เรา") เป็นแอปพลิเคชันสำหรับติดตามตำแหน่งของสมาชิกในทริปแบบเรียลไทม์ผ่าน LINE นโยบายนี้อธิบายว่าเราเก็บข้อมูลอะไร ใช้เพื่ออะไร แบ่งปันกับใคร และคุณมีสิทธิอะไรบ้าง โดยสอดคล้องกับ **พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)**

## 1. ข้อมูลที่เราเก็บรวบรวม

- **ข้อมูลบัญชี LINE** — เมื่อคุณเข้าสู่ระบบด้วย LINE Login เราได้รับ LINE User ID, ชื่อที่แสดง (display name) และรูปโปรไฟล์ เพื่อระบุตัวตนของคุณในทริป
- **ข้อมูลตำแหน่ง (GPS)** — พิกัด (ละติจูด/ลองจิจูด), ความแม่นยำ และเวลา เก็บขณะที่คุณอยู่ในทริปที่กำลังใช้งาน รวมถึง **ขณะแอปทำงานเบื้องหลัง** (background) ผ่าน foreground service เพื่อให้สมาชิกเห็นตำแหน่งของกันและกัน
- **ข้อมูลทริปและสมาชิก** — ทริปที่คุณสร้าง/เข้าร่วม, บทบาท (หัวหน้าทริป), เวลาเข้าร่วม, จุดหมายปลายทาง และสถานะการมาถึง
- **เหตุการณ์ฉุกเฉิน (SOS)** — เมื่อคุณกดขอความช่วยเหลือ เราเก็บตำแหน่งและเวลาของเหตุการณ์นั้นเพื่อแจ้งเตือนสมาชิกคนอื่น
- **ข้อมูลทางเทคนิคขั้นต่ำ** — โทเคนการยืนยันตัวตน (JWT) ที่เก็บไว้บนเครื่องของคุณอย่างปลอดภัย และข้อมูลที่จำเป็นต่อการทำงานของระบบ

> เรา**ไม่เก็บ**ข้อมูลการชำระเงิน และ**ไม่ใช้** SDK โฆษณา *(หากภายหลังเพิ่มเครื่องมือวิเคราะห์/แจ้งข้อผิดพลาด เช่น analytics/crash reporting ต้องปรับนโยบายข้อนี้)*

## 2. เราใช้ข้อมูลเพื่ออะไร

- แสดงตำแหน่งสมาชิกแบบเรียลไทม์ คำนวณระยะทาง/เวลาถึงโดยประมาณ (ETA) และตรวจจับการมาถึง
- แจ้งเตือนความปลอดภัย (เช่น สมาชิกขาดการติดต่อ, การขอความช่วยเหลือ SOS)
- จัดการทริป สมาชิก และลิงก์คำเชิญ
- ส่งการแจ้งเตือนที่เกี่ยวข้องผ่าน LINE

เราประมวลผลข้อมูลตำแหน่งของคุณ **บนฐานความยินยอม** ของคุณ ซึ่งคุณถอนได้ตลอดเวลาโดยปิดการแชร์ตำแหน่ง/ออกจากทริป

## 3. ข้อมูลตำแหน่งและการทำงานเบื้องหลัง

แอปเก็บตำแหน่งของคุณ **แม้ขณะปิดหน้าจอหรือไม่ได้เปิดแอป** เฉพาะเมื่อคุณอยู่ในทริปที่กำลังใช้งาน เพื่อให้การติดตามทริปต่อเนื่อง โดยจะมีการแจ้งเตือน (foreground service notification) ขณะติดตาม คุณหยุดได้ทุกเมื่อด้วยการจบ/ออกจากทริป หรือปิดสิทธิ์ตำแหน่งในตั้งค่าเครื่อง

## 4. การเปิดเผยและแบ่งปันข้อมูล

- **กับสมาชิกในทริปเดียวกัน** — ตำแหน่ง ชื่อ รูปโปรไฟล์ สถานะการมาถึง และการแจ้ง SOS ของคุณจะแสดงให้สมาชิกคนอื่นในทริปเห็น *(นี่คือฟังก์ชันหลักของแอป)*
- **ผู้ให้บริการภายนอก** (ดูข้อ 5)
- เรา **ไม่ขาย** ข้อมูลส่วนบุคคลของคุณ และไม่แบ่งปันเพื่อการโฆษณา
- เราอาจเปิดเผยข้อมูลหากกฎหมายกำหนด

## 5. บริการของบุคคลที่สาม

- **LINE (LINE Corporation)** — ใช้สำหรับเข้าสู่ระบบ (LINE Login) และส่งการแจ้งเตือน (Messaging API) อยู่ภายใต้นโยบายความเป็นส่วนตัวของ LINE
- **OpenStreetMap / Nominatim** — เมื่อค้นหา/แปลงพิกัดเป็นชื่อสถานที่ พิกัดหรือคำค้นจะถูกส่งไปยังบริการของ OpenStreetMap Foundation; แผนที่ (map tiles) ก็โหลดจาก OpenStreetMap (ที่อยู่ IP ของคุณอาจถูกเปิดเผยต่อผู้ให้บริการแผนที่)
- **ผู้ให้บริการเซิร์ฟเวอร์ (hosting)** — ข้อมูลถูกจัดเก็บบนเซิร์ฟเวอร์ของเราที่ **Visper Host (ประเทศไทย)** ซึ่งตั้งอยู่ในศูนย์ข้อมูล (data center) ในประเทศไทย

## 6. การจัดเก็บและระยะเวลา

- เรา**ไม่**ลบข้อมูลทริปย้อนหลังของคุณโดยอัตโนมัติตามกำหนดเวลา ทริป สมาชิก ข้อมูลตำแหน่ง และเหตุการณ์ SOS จะถูกเก็บไว้ตราบเท่าที่ทริปและบัญชีของคุณยังอยู่
- ทริปที่จบแล้วจะถูก**เก็บถาวร** (archive — ซ่อนจากรายการที่ใช้งาน) ไม่ได้ถูกลบ; หัวหน้าทริปสามารถ**รีเซ็ต**ทริปได้ ซึ่งจะลบประวัติตำแหน่งของทริปนั้นอย่างถาวร
- ข้อมูลเดียวที่มีอายุการเก็บอัตโนมัติคือ**เซสชันการเข้าสู่ระบบผ่านเว็บ (LIFF)** ซึ่งจะหมดอายุและถูกลบโดยอัตโนมัติประมาณ **4 ชั่วโมง** หลังเข้าสู่ระบบ
- คุณสามารถขอให้ลบบัญชีและข้อมูลส่วนบุคคลของคุณได้ตลอดเวลา (ดูข้อ 8) โดยเราดำเนินการตามคำขอด้วยตนเองผ่านอีเมลติดต่อ

## 7. ความปลอดภัย

ข้อมูลถูกส่งผ่านการเชื่อมต่อที่เข้ารหัส (HTTPS) การยืนยันตัวตนใช้ LINE OAuth 2.0 และโทเคน JWT เราใช้มาตรการตามสมควรเพื่อปกป้องข้อมูล อย่างไรก็ตาม ไม่มีระบบใดปลอดภัย 100%

## 8. สิทธิของคุณภายใต้ PDPA

คุณมีสิทธิ: เข้าถึง/ขอสำเนา, แก้ไขให้ถูกต้อง, **ลบ**, ระงับการใช้, คัดค้านการประมวลผล, ขอให้โอนย้ายข้อมูล, และ **ถอนความยินยอม** ได้ตลอดเวลา
ติดต่อใช้สิทธิได้ที่ **fontong.jod.aekkarut@gmail.com** หากไม่ได้รับการแก้ไข คุณมีสิทธิร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส./PDPC)

## 9. เด็กและเยาวชน

แอปนี้ไม่ได้มุ่งเป้าไปที่เด็กอายุต่ำกว่า 13 ปี ผู้เยาว์ควรได้รับความยินยอมจากผู้ปกครองตามที่ PDPA กำหนด

## 10. การเปลี่ยนแปลงนโยบาย

เราอาจปรับปรุงนโยบายนี้ และจะระบุวันที่ปรับปรุงล่าสุดไว้ด้านบน การใช้แอปต่อหลังการเปลี่ยนแปลงถือว่าคุณรับทราบนโยบายฉบับใหม่

## 11. ติดต่อเรา

**ผู้ดูแลข้อมูล:** AiKlao — Aekkarat Fontong และ Peerapol Thichaiwong
**อีเมล:** fontong.jod.aekkarut@gmail.com

---

# 🇬🇧 Privacy Policy (English)

AiKlao ("the app", "we", "us") is an application for real-time group trip tracking via LINE. This policy explains what data we collect, why, who we share it with, and your rights. It is written to align with Thailand's **Personal Data Protection Act B.E. 2562 (PDPA)**.

## 1. Information We Collect

- **LINE account info** — when you sign in with LINE Login, we receive your LINE User ID, display name, and profile picture, used to identify you within a trip.
- **Location data (GPS)** — latitude/longitude, accuracy, and timestamp, collected while you are in an active trip, **including while the app runs in the background** via a foreground service, so trip members can see each other's location.
- **Trip & membership data** — trips you create/join, your role (trip leader), join time, destination, and arrival status.
- **Emergency (SOS) events** — when you trigger SOS, we record the location and time of that event to alert other members.
- **Minimal technical data** — an authentication token (JWT) stored securely on your device, and data required for the service to function.

> We do **not** collect payment information and do **not** use advertising SDKs. *(If analytics/crash-reporting tools are added later, this section must be updated.)*

## 2. How We Use Your Information

- Show members' live location, compute distance / estimated time of arrival (ETA), and detect arrival
- Provide safety alerts (e.g. a member losing signal, SOS requests)
- Manage trips, members, and invite links
- Send relevant notifications via LINE

We process your location data **on the basis of your consent**, which you can withdraw at any time by turning off location sharing or leaving the trip.

## 3. Location Data & Background Use

The app collects your location **even when the screen is off or the app is not open**, but only while you are in an active trip, to provide continuous trip tracking. A notification is shown while tracking is active. You can stop it anytime by ending/leaving the trip or disabling location permission in your device settings.

## 4. Disclosure & Sharing

- **With members of the same trip** — your location, name, profile picture, arrival status, and SOS alerts are visible to other members of that trip *(this is the app's core function)*.
- **Third-party service providers** (see Section 5)
- We do **not sell** your personal data and do not share it for advertising.
- We may disclose data where required by law.

## 5. Third-Party Services

- **LINE (LINE Corporation)** — used for sign-in (LINE Login) and notifications (Messaging API), subject to LINE's privacy policy.
- **OpenStreetMap / Nominatim** — when searching or reverse-geocoding a place, coordinates or queries are sent to the OpenStreetMap Foundation's service; map tiles are also loaded from OpenStreetMap (your IP address may be exposed to the map provider).
- **Hosting provider** — data is stored on our servers hosted with **Visper Host (Thailand)**, in a data center located in Thailand.

## 6. Data Retention

- We do **not** delete your historical trip data automatically on a timer. Your trips, members, location data, and SOS events are retained for as long as the trip and your account exist.
- Completed trips are **archived** (hidden from the active list) rather than deleted; a trip leader can **reset** a trip, which permanently deletes that trip's location history.
- The only data with an automatic lifetime is your **LINE web-login (LIFF) session**, which expires and is deleted automatically about **4 hours** after sign-in.
- You can request deletion of your account and personal data at any time (see Section 8); we handle such requests manually via the contact email.

## 7. Security

Data is transmitted over encrypted connections (HTTPS). Authentication uses LINE OAuth 2.0 and JWT tokens. We apply reasonable measures to protect your data; however, no system is 100% secure.

## 8. Your Rights under PDPA

You have the right to: access/obtain a copy, rectify, **erase**, restrict, object to processing, request data portability, and **withdraw consent** at any time.
To exercise these rights, contact **fontong.jod.aekkarut@gmail.com**. If unresolved, you may lodge a complaint with Thailand's Personal Data Protection Committee (PDPC).

## 9. Children

This app is not directed to children under 13. Minors should obtain guardian consent as required by the PDPA.

## 10. Changes to This Policy

We may update this policy and will indicate the "Last updated" date above. Continued use of the app after changes means you accept the updated policy.

## 11. Contact Us

**Data controller:** AiKlao — Aekkarat Fontong and Peerapol Thichaiwong
**Email:** fontong.jod.aekkarut@gmail.com
