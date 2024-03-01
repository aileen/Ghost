import {InfiniteData} from '@tanstack/react-query';
import {Meta, createInfiniteQuery, createMutation} from '../utils/api/hooks';

// Types

export type CustomField = {
    id: string;
    name: string;
    type: 'url' | 'short' | 'long' | 'boolean';
    enabled: boolean;
    created_at: string;
    updated_at: string;
}

export interface CustomFieldResponseType {
    meta?: Meta;
    fields: CustomField[];
}

export interface CustomFieldEditResponseType extends CustomFieldResponseType {
}

export interface CustomFieldDeleteResponseType {}

// Requests

const dataType = 'CustomFieldResponseType';

export const useBrowseCustomFields = createInfiniteQuery<CustomFieldResponseType>({
    dataType,
    path: '/fields/custom/',
    returnData: (originalData) => {
        const {pages} = originalData as InfiniteData<CustomFieldResponseType>;
        let fields = pages.flatMap(page => page.fields);

        // Remove duplicates
        fields = fields.filter((field, index) => {
            return fields.findIndex(({id}) => id === field.id) === index;
        });

        return {
            fields,
            meta: pages[pages.length - 1].meta
        };
    }
});

export const useDeleteCustomField = createMutation<CustomFieldDeleteResponseType, CustomField>({
    method: 'DELETE',
    path: field => `/fields/custom/${field.id}/`,

    invalidateQueries: {
        dataType
    }
});

export const useEditCustomField = createMutation<CustomFieldEditResponseType, Partial<CustomField> & {id: string}>({
    method: 'PUT',
    path: field => `/fields/custom/${field.id}/`,
    body: field => ({fields: [field]}),

    invalidateQueries: {
        dataType
    }
});

export const useAddCustomField = createMutation<CustomFieldResponseType, Partial<CustomField>>({
    method: 'POST',
    path: () => '/fields/custom/',
    body: ({...field}) => ({fields: [field]}),

    invalidateQueries: {
        dataType
    }
});
