// src/components/InviteMembersModal.tsx
// Phase 6.4c — leader-only modal to generate + share a trip invite.
// Fetches POST /api/mobile/trips/:tripId/invite on open; shows code/link/expiry
// with copy + native share. Loading / error / retry states included.

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import type { AxiosError } from 'axios';
import { Button } from '@/components/Button';
import { createInvite, InviteResponse } from '@/api/client';
import { notify } from '@/services/notify';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, typography } from '@/theme';
import type { Palette } from '@/theme';

interface InviteMembersModalProps {
  visible: boolean;
  tripId: string;
  tripName?: string;
  onClose: () => void;
}

function formatExpiry(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function InviteMembersModal({ visible, tripId, tripName, onClose }: InviteMembersModalProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteResponse | null>(null);

  const fetchInvite = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await createInvite(tripId);
      setInvite(data);
    } catch (e) {
      const status = (e as AxiosError).response?.status;
      if (status === 403) setError('เฉพาะหัวหน้าทริปเท่านั้นที่เชิญเพื่อนได้');
      else setError('โหลดลิงก์ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    if (visible) fetchInvite();
  }, [visible, fetchInvite]);

  const onCopyCode = useCallback(async () => {
    if (!invite) return;
    await Clipboard.setStringAsync(invite.code);
    notify('คัดลอกรหัสแล้ว');
  }, [invite]);

  const onCopyLink = useCallback(async () => {
    if (!invite) return;
    await Clipboard.setStringAsync(invite.link);
    notify('คัดลอกลิงก์แล้ว');
  }, [invite]);

  const onShare = useCallback(async () => {
    if (!invite) return;
    const header = tripName ? `ร่วมทริปกับเรา: ${tripName}` : 'ร่วมทริปกับเรา';
    await Share.share({ message: `${header}\n${invite.link}\nหรือใช้รหัส: ${invite.code}` });
  }, [invite, tripName]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>👥 เชิญเพื่อนเข้าทริป</Text>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>{error}</Text>
              <Button label="ลองอีกครั้ง" onPress={fetchInvite} style={{ marginTop: spacing.md }} />
            </View>
          ) : invite ? (
            <>
              <Text style={styles.label}>รหัสเชิญ</Text>
              <View style={styles.codeRow}>
                <Text style={styles.codeText} selectable>{invite.code}</Text>
                <TouchableOpacity style={styles.smallBtn} onPress={onCopyCode}>
                  <Text style={styles.smallBtnText}>📋 คัดลอก</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>ลิงก์เชิญ</Text>
              <View style={styles.linkRow}>
                <Text style={styles.linkText} numberOfLines={1} selectable>{invite.link}</Text>
                <TouchableOpacity style={styles.smallBtn} onPress={onCopyLink}>
                  <Text style={styles.smallBtnText}>📋 คัดลอก</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.expiry}>ลิงก์หมดอายุ: {formatExpiry(invite.expires_at)}</Text>

              <Button label="📤 แชร์" fullWidth onPress={onShare} style={{ marginTop: spacing.md }} />
            </>
          ) : null}

          <Button
            label="ปิด"
            variant="ghost"
            fullWidth
            onPress={onClose}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: spacing.lg,
      paddingBottom: spacing.xl,
    },
    title: {
      ...typography.h3,
      color: c.textPrimary,
      marginBottom: spacing.lg,
    },
    centered: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl,
    },
    label: {
      ...typography.caption,
      color: c.textSecondary,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    codeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    codeText: {
      ...typography.h2,
      color: c.primary,
      letterSpacing: 2,
      flex: 1,
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    linkText: {
      ...typography.bodySmall,
      color: c.textSecondary,
      flex: 1,
    },
    smallBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.primary,
    },
    smallBtnText: {
      ...typography.caption,
      color: c.primary,
      fontWeight: '600',
    },
    expiry: {
      ...typography.caption,
      color: c.textSecondary,
      marginTop: spacing.md,
    },
    errorText: {
      ...typography.body,
      color: c.danger,
      textAlign: 'center',
    },
  });
}
