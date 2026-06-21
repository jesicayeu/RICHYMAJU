<?php

namespace App\Services;

use InvalidArgumentException;

class QrisPaymentService
{
    public function normalizeStatic(string $payload): string
    {
        $payload = trim($payload);

        return preg_replace('/[\r\n\t]+/', '', $payload) ?? $payload;
    }

    public function assertValidStatic(string $payload): void
    {
        $normalized = $this->normalizeStatic($payload);

        if (! str_starts_with($normalized, '000201')) {
            throw new InvalidArgumentException('Payload QRIS tidak valid.');
        }

        $this->generateDynamic($normalized, 1);
    }

    public function generateDynamic(string $staticQris, int $amount): string
    {
        $payload = $this->normalizeStatic($staticQris);

        if ($amount <= 0) {
            throw new InvalidArgumentException('Nominal harus lebih dari 0.');
        }

        if (! str_starts_with($payload, '000201')) {
            throw new InvalidArgumentException('Payload QRIS tidak valid.');
        }

        $withoutCrc = $this->stripCrc($payload);
        $fields = $this->parseTlv($withoutCrc);
        $rebuilt = [];

        foreach ($fields as $field) {
            if (in_array($field['tag'], ['54', '63'], true)) {
                continue;
            }

            if ($field['tag'] === '01' && $field['value'] === '11') {
                $field['value'] = '12';
                $field['length'] = 2;
                $field['raw'] = $this->formatField('01', '12');
            }

            $rebuilt[] = $field;
        }

        $amountText = (string) $amount;
        $amountField = [
            'tag' => '54',
            'length' => strlen($amountText),
            'value' => $amountText,
            'raw' => $this->formatField('54', $amountText),
        ];

        $inserted = false;
        foreach ($rebuilt as $index => $field) {
            if (strcmp($field['tag'], '54') > 0) {
                array_splice($rebuilt, $index, 0, [$amountField]);
                $inserted = true;
                break;
            }
        }

        if (! $inserted) {
            $rebuilt[] = $amountField;
        }

        $body = $this->buildTlv($rebuilt);
        $payloadForCrc = $body.'6304';

        return $payloadForCrc.$this->crc16($payloadForCrc);
    }

    private function stripCrc(string $payload): string
    {
        $payload = $this->normalizeStatic($payload);

        if (strlen($payload) < 8 || substr($payload, -8, 4) !== '6304') {
            throw new InvalidArgumentException('Tag CRC 6304 tidak ditemukan di akhir payload QRIS.');
        }

        return substr($payload, 0, -8);
    }

    /**
     * @return list<array{tag: string, length: int, value: string, raw: string}>
     */
    private function parseTlv(string $payload): array
    {
        $fields = [];
        $length = strlen($payload);

        for ($i = 0; $i < $length;) {
            if ($i + 4 > $length) {
                throw new InvalidArgumentException('TLV QRIS tidak valid.');
            }

            $tag = substr($payload, $i, 2);
            $lengthText = substr($payload, $i + 2, 2);

            if (! ctype_digit($tag) || ! ctype_digit($lengthText)) {
                throw new InvalidArgumentException('Tag atau panjang TLV tidak valid.');
            }

            $fieldLength = (int) $lengthText;
            $valueStart = $i + 4;

            if ($valueStart + $fieldLength > $length) {
                throw new InvalidArgumentException('Panjang TLV melebihi payload.');
            }

            $value = substr($payload, $valueStart, $fieldLength);
            $fields[] = [
                'tag' => $tag,
                'length' => $fieldLength,
                'value' => $value,
                'raw' => substr($payload, $i, 4 + $fieldLength),
            ];

            $i = $valueStart + $fieldLength;
        }

        return $fields;
    }

    /**
     * @param  list<array{tag: string, length: int, value: string, raw: string}>  $fields
     */
    private function buildTlv(array $fields): string
    {
        $out = '';

        foreach ($fields as $field) {
            $out .= $this->formatField($field['tag'], $field['value']);
        }

        return $out;
    }

    private function formatField(string $tag, string $value): string
    {
        return $tag.str_pad((string) strlen($value), 2, '0', STR_PAD_LEFT).$value;
    }

    private function crc16(string $payload): string
    {
        $crc = 0xFFFF;
        $length = strlen($payload);

        for ($i = 0; $i < $length; $i++) {
            $crc ^= ord($payload[$i]) << 8;

            for ($j = 0; $j < 8; $j++) {
                if (($crc & 0x8000) !== 0) {
                    $crc = (($crc << 1) ^ 0x1021) & 0xFFFF;
                } else {
                    $crc = ($crc << 1) & 0xFFFF;
                }
            }
        }

        return strtoupper(str_pad(dechex($crc), 4, '0', STR_PAD_LEFT));
    }
}
