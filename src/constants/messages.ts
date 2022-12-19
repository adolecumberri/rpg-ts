let M = {
    errors: {
        out_of_bounds: {
            between_thousand_and_zero: (name: string) =>
                `${name} must have a value between zero and one. (it's a %, 0 never and 100 always) `,
            lower_than_zero: (name: string) => `${name} must have a value  higher than 0 `,
            lower_than_one: (name: string) => `${name} must have a value higher than 1 `,
        },
        nested_unsupported: 'Nested Attributes are not supported'
    },
};

export default M;
