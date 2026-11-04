begin
p = Orders::Payment.find("01a17908-ccf4-75de-96c3-282ee9c02eda")
client = Payments::Providers::Registry.fetch("chapa").instance_variable_get(:@client)
r = client.send(:get, "/v2/payments/HCCePSUoB7pn/verify")
d = r.body.to_h[:data].to_h
puts JSON.generate(http_status: r.status, provider_status: d[:status], amount_minor: d[:amount], currency: d[:currency], merchant_matches_new_order: d[:merchant_reference] == p.provider_merchant_reference, payment_status: p.status, order_status: p.order.status)
rescue StandardError => e
 puts JSON.generate(error_class: e.class.name)
end