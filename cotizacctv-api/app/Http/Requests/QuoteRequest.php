<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class QuoteRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'client_name' => 'required|string|max:255',
            'client_phone' => 'nullable|string|max:50',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'nullable|numeric|min:0',
            'freight_cost' => 'nullable|numeric|min:0',
            'installation_total' => 'nullable|numeric|min:0',
            'installation_days' => 'nullable|integer|min:1',
            'discount_amount' => 'nullable|numeric|min:0',
            'discount_type' => 'nullable|string|in:fixed,percentage',
            'extra_expenses' => 'nullable|array',
            'extra_expenses.*.description' => 'required_with:extra_expenses|string|max:255',
            'extra_expenses.*.amount' => 'required_with:extra_expenses|numeric|min:0',
        ];
    }
}
