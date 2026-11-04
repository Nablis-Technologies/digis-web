begin
reference = "HCGyXsbvSn5r"
adapter = Payments::Providers::Registry.fetch("chapa")
response = adapter.instance_variable_get(:@client).send(:get, "/v2/payments/#{CGI.escape(reference)}/verify")
if response.respond_to?(:body)
  body = response.body.to_h
  data = body[:data].to_h
  puts JSON.generate(http_status: response.status, envelope_status: body[:status], code: body[:code], data_keys: data.keys, payment: data.slice(:status, :payment_status, :amount, :currency, :merchant_reference, :chapa_reference, :reference), meta: data[:meta].to_h.slice(:payment_id, :order_id))
else
  puts JSON.generate(status: response.status, failure_code: response.failure_code)
end
matches = Orders::Payment.where(provider_reference: reference).or(Orders::Payment.where(provider_merchant_reference: reference)).limit(3)
puts JSON.generate(local_exact_matches: matches.map {|p| {id: p.id, status: p.status, order_id: p.order_id}})
rescue StandardError => error
  puts JSON.generate(diagnostic_error_class: error.class.name)
end
