<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBrandRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $brandId = $this->route('brand')->id ?? $this->route('brand');

        return [
            'name' => 'required|string|max:255',
            'slug' => 'required|string|unique:brands,slug,' . $brandId,
        ];
    }
}
