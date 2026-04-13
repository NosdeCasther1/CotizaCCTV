<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
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
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $productId = $this->route('product')->id ?? $this->route('product');

        return [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'sku' => [
                'required',
                'string',
                Rule::unique('products', 'sku')
                    ->ignore($productId)
                    ->whereNull('deleted_at')
            ],
            'category_id' => 'required|exists:categories,id',
            'brand_id' => 'nullable|exists:brands,id',
            'margin_percentage' => 'nullable|numeric|min:0|max:100',
            'suppliers' => 'required|array|min:1',
            'suppliers.*.supplier_id' => 'required|exists:suppliers,id',
            'suppliers.*.cost' => 'required|numeric|min:0',
            'suppliers.*.is_default' => 'nullable|boolean',
        ];
    }
}
