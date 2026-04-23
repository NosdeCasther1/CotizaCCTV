<!DOCTYPE html>
<html lang="es">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Cotización #{{ $quote->id }} | {{ $settings['company_name'] ?? 'CotizaCCTV' }}</title>
    <style>
        * {
            font-family: 'DejaVu Sans', sans-serif;
        }
        body {
            font-size: 12px;
            color: #333;
            line-height: 1.5;
            margin: 0;
            padding: 0;
        }
        .container {
            padding: 20px 30px;
        }
        .header {
            border-bottom: 2px solid {{ $settings['primary_color'] ?? '#1a3a5a' }};
            padding-bottom: 8px;
            margin-bottom: 15px;
        }
        .header table {
            width: 100%;
        }
        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: {{ $settings['primary_color'] ?? '#1a3a5a' }};
        }
        .quote-info {
            text-align: right;
        }
        .client-info {
            margin-bottom: 20px;
        }
        .client-info h2 {
            font-size: 14px;
            color: {{ $settings['primary_color'] ?? '#1a3a5a' }};
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
        }
        table.items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            table-layout: fixed;
        }
        table.items-table th {
            background-color: #f8f9fa;
            border-bottom: 2px solid #dee2e6;
            padding: 6px 8px;
            text-align: left;
            color: {{ $settings['primary_color'] ?? '#1a3a5a' }};
            font-size: 10px;
            text-transform: uppercase;
        }
        table.items-table td {
            border-bottom: 1px solid #dee2e6;
            padding: 6px 8px;
            vertical-align: top;
            word-wrap: break-word;
        }
        table.items-table tr {
            page-break-inside: avoid;
        }
        .totals-section {
            width: 100%;
            page-break-inside: avoid;
        }
        .totals-table {
            width: 300px;
            margin-left: auto;
            border-collapse: collapse;
        }
        .totals-table td {
            padding: 5px 10px;
        }
        .totals-table .label {
            text-align: right;
            font-weight: bold;
            color: #555;
        }
        .totals-table .value {
            text-align: right;
        }
        .grand-total-row td {
            border-top: 2px solid {{ $settings['primary_color'] ?? '#1a3a5a' }};
            padding-top: 10px;
            font-size: 14px;
            font-weight: bold;
            color: {{ $settings['primary_color'] ?? '#1a3a5a' }};
        }
        .footer {
            margin-top: 50px;
            font-size: 10px;
            color: #777;
            text-align: center;
            border-top: 1px solid #ddd;
            padding-top: 10px;
        }
        .text-right {
            text-align: right;
        }
        .product-description {
            font-size: 8.5pt;
            color: #555;
            margin-top: 3px;
            line-height: 1.3;
        }
        .product-description p {
            margin: 2px 0;
        }
        .product-description ul, .product-description ol {
            margin: 5px 0;
            padding-left: 20px;
        }
        .product-description li {
            margin-bottom: 2px;
        }
        .category-header {
            background-color: #f1f5f9;
            font-weight: bold;
            color: {{ $settings['primary_color'] ?? '#1a3a5a' }};
        }
        .category-header td {
            padding: 5px 8px !important;
            border-bottom: 2px solid #e2e8f0 !important;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .text-muted {
            color: #777;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <table>
                <tr>
                    <td>
                        @if(!empty($settings['company_logo_base64']) && str_starts_with($settings['company_logo_base64'], 'data:image'))
                            <img src="{{ $settings['company_logo_base64'] }}" style="max-height: 60px;">
                        @else
                            <h1 class="company-name">{{ $settings['company_name'] ?? 'CotizaCCTV' }}</h1>
                        @endif
                    </td>
                    <td class="quote-info">
                        <div style="font-size: 18px; font-weight: bold;">COTIZACIÓN</div>
                        <div>No: #{{ str_pad($quote->id, 5, '0', STR_PAD_LEFT) }}</div>
                        <div>Fecha: {{ $quote->created_at->format('d/m/Y') }}</div>
                    </td>
                </tr>
            </table>
        </div>

        <div class="client-info">
            <h2>Datos del Cliente</h2>
            <table width="100%">
                <tr>
                    <td width="50%">
                        <strong>Nombre:</strong> {{ $quote->client_name }}
                    </td>
                    <td width="50%" class="text-right">
                        <strong>Válida hasta:</strong> {{ $quote->expires_at->format('d/m/Y') }}
                        <br><strong>Días de Inst.:</strong> {{ $quote->installation_days }} días
                    </td>
                </tr>
            </table>
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th width="20%">SKU</th>
                    <th width="45%">Descripción</th>
                    <th width="10%" class="text-right">Cant.</th>
                    <th width="12%" class="text-right">P. Unit.</th>
                    <th width="13%" class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                @php
                    $marginFactor = $quote->subtotal_materials > 0 
                        ? (1 + ($quote->margin_applied / $quote->subtotal_materials)) 
                        : 1;
                @endphp
                @foreach($itemsByCategory as $categoryName => $items)
                    <tr class="category-header">
                        <td colspan="5">{{ $categoryName }}</td>
                    </tr>
                    @foreach($items as $item)
                        @php
                            $unitPriceWithMargin = $item->frozen_unit_cost * $marginFactor;
                            $itemTotal = $unitPriceWithMargin * $item->quantity;
                        @endphp
                        <tr>
                            <td style="font-size: 8.5pt;">{{ $item->product->sku ?? 'N/A' }}</td>
                            <td>
                                <div style="font-size: 10pt; font-weight: bold;">{{ $item->product ? $item->product->name : 'Producto Eliminado' }}</div>
                                @if($item->product && $item->product->description)
                                    <div class="product-description">
                                        {!! $item->product->description !!}
                                    </div>
                                @endif
                            </td>
                            <td class="text-right">{{ $item->quantity }}</td>
                            <td class="text-right">Q {{ number_format($unitPriceWithMargin, 0) }}</td>
                            <td class="text-right">Q {{ number_format($itemTotal, 0) }}</td>
                        </tr>
                    @endforeach
                @endforeach
            </tbody>
        </table>

        <div class="totals-section">
            <table class="totals-table">
                <tr>
                    <td class="label">Subtotal Materiales:</td>
                    <td class="value">Q {{ number_format($quote->subtotal_materials + $quote->margin_applied, 0) }}</td>
                </tr>
                <tr>
                    <td class="label">Mano de Obra:</td>
                    <td class="value">Q {{ number_format($quote->installation_total, 0) }}</td>
                </tr>
                <tr>
                    <td class="label">Logística y Otros:</td>
                    <td class="value">Q {{ number_format($quote->freight_cost + $quote->gasoline_cost + $quote->per_diem_cost, 0) }}</td>
                </tr>
                @php
                    $baseTotalBeforeDiscount = ($quote->subtotal_materials + $quote->margin_applied) + 
                                               $quote->installation_total + 
                                               ($quote->freight_cost + $quote->gasoline_cost + $quote->per_diem_cost);
                    
                    $discountDisplay = 0;
                    if ($quote->discount_amount > 0) {
                        $discountDisplay = $quote->discount_type === 'percentage'
                            ? round($baseTotalBeforeDiscount * ($quote->discount_amount / 100), 0)
                            : $quote->discount_amount;
                    }
                @endphp
                @if($discountDisplay > 0)
                <tr>
                    <td class="label" style="color: #c62828;">Descuento Especial:</td>
                    <td class="value" style="color: #c62828; font-weight: bold;">- Q {{ number_format($discountDisplay, 0) }}</td>
                </tr>
                @endif
                <tr class="grand-total-row">
                    <td class="label">GRAN TOTAL:</td>
                    <td class="value">Q {{ number_format($quote->grand_total, 0) }}</td>
                </tr>
            </table>
        </div>

        <div class="footer">
            <p>{{ $settings['quote_footer_text'] ?? 'Gracias por su preferencia. Cotización sujeta a inspección física.' }}</p>
            <p>Generado automáticamente el {{ now()->format('d/m/Y H:i') }}</p>
        </div>
    </div>
</body>
</html>
