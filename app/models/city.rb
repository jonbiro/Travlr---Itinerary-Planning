class City < ApplicationRecord
  belongs_to :trip
  has_many :places
end
