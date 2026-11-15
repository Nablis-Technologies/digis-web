begin
p = Orders::Payment.find("01a17908-ccf4-75de-96c3-282ee9c02eda")
client = Payments::Providers::Registry.fetch("chapa").instance_variable_get(:@client)
refs={receipt:"HCCePSUoB7pn",merchant:p.provider_merchant_reference}
refs.each do |kind,ref|
 r=client.send(:get,"/v2/payments/#{CGI.escape(ref)}/verify")
 d=r.body.to_h[:data].to_h
 puts JSON.generate(kind:kind,http_status:r.status,status:d[:status],error_code:r.body.to_h[:code],amount_minor:d[:amount],merchant_matches:d[:merchant_reference].present? && d[:merchant_reference]==p.provider_merchant_reference)
end
url=URI.parse(p.checkout_url)
puts JSON.generate(hosted_url_host:url.host,hosted_reference_matches_receipt:url.path.split('/').last==refs[:receipt],payment_status:p.status,order_status:p.order.status)
rescue StandardError=>e
 puts JSON.generate(error_class:e.class.name)
end